        function verificarAutenticacaoAnuncio() {
            fecharMenuMobile();
            if (!currentUser) {
                mostrarAlerta("Atenção", "Você precisa estar logado para anunciar uma conta!", "aviso");
                openModal();
                return;
            }
            if (usuarioEstaBanido(sanitizarNomePublico(currentUser.username), currentUser.email)) {
                mostrarAlerta("Acesso Bloqueado", "Sua conta está banida e não pode anunciar.", "aviso");
                return;
            }
            document.getElementById("preview-vendedor-nome").textContent = sanitizarNomePublico(currentUser.username);
            setModalVisivel("modal-anuncio", true);
            atualizarRecebimentoVendedor();
        }
        function closeVerificarAnuncio() { setModalVisivel("modal-verificar-anuncio", false); }

        function gerarCodigoVerificacao(email) {
            if (ehEmailAdmin(email) && CODIGO_ADMIN_FIXO) return CODIGO_ADMIN_FIXO;
            return Math.floor(100000 + Math.random() * 900000).toString();
        }

        function emailjsConfigurado() {
            return Boolean(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY && window.emailjs && typeof window.emailjs.send === "function");
        }

        async function enviarCodigoPorEmail(email, codigo) {
            if (!emailjsConfigurado()) return false;
            try {
                if (!emailjsInicializado) {
                    window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
                    emailjsInicializado = true;
                }
                await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                    to_email: email,
                    email: email,
                    codigo_verificacao: codigo,
                    codigo: codigo,
                    message: `Seu código de verificacao do MARKTPLACE stand2 e: ${codigo}`
                });
                return true;
            } catch (e) {
                return false;
            }
        }

        async function enviarCodigoAnuncio() {
            const email = document.getElementById("anuncio-email").value.trim();
            const feedback = document.getElementById("anuncio-feedback");
            if (!email || !email.endsWith("@gmail.com")) { feedback.textContent = "Insira um Gmail válido."; return; }
            codigoAnuncioSimulado = gerarCodigoVerificacao(email);
            const enviado = await enviarCodigoPorEmail(email, codigoAnuncioSimulado);
            feedback.style.color = "#10b981";
            feedback.textContent = enviado ? "Código enviado para o seu Gmail! Confira a caixa de entrada." : `Código enviado! (Código: ${codigoAnuncioSimulado})`;
            const area = document.getElementById("anuncio-codigo-area");
            if (area) area.classList.remove("hidden");
            const campoCodigo = document.getElementById("anuncio-code");
            if (campoCodigo) campoCodigo.focus();
        }

        function confirmarCodigoAnuncio(event) {
            event.preventDefault();
            const codigoInput = document.getElementById("anuncio-code").value.trim();
            const feedback = document.getElementById("anuncio-feedback");
            if (!codigoAnuncioSimulado || codigoInput !== codigoAnuncioSimulado) {
                feedback.textContent = "Código incorreto!";
                return;
            }
            closeVerificarAnuncio();
            document.getElementById("anuncio-code").value = "";
            feedback.textContent = "";
            document.getElementById("preview-vendedor-nome").textContent = sanitizarNomePublico(currentUser.username);
            setModalVisivel("modal-anuncio", true);
            atualizarRecebimentoVendedor();
        }
        function closeAnuncioModal() { setModalVisivel("modal-anuncio", false); }

        function calcularComissaoVendedor(preco) {
            const valor = Number(preco || 0);
            if (!isFinite(valor) || valor <= 0) return { taxa: 0, regra: "sem comissão" };
            if (valor <= 100) return { taxa: 3, regra: "R$ 3,00 de comissão da plataforma" };
            if (valor <= 250) return { taxa: valor * 0.04, regra: "4% de comissão da plataforma" };
            return { taxa: valor * 0.08, regra: "8% de comissão da plataforma" };
        }

        function atualizarRecebimentoVendedor() {
            const brute = parseFloat(String(document.getElementById("conta-preco").value || "").replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
            const box = document.getElementById("info-comissao");
            if (!brute) { box.classList.add("hidden"); box.innerHTML = ""; return; }
            const fmt = (v) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const comissao = calcularComissaoVendedor(brute);
            const liquido = Math.max(0, brute - comissao.taxa);
            box.innerHTML = '<p class="text-xs font-bold text-emerald-400">💸 Você recebe ' + fmt(liquido) + '</p>' +
                '<p class="text-[10px] text-gray-400 mt-0.5">Valor anunciado: ' + fmt(brute) + ' · ' + comissao.regra + '. Taxas de processamento do Mercado Pago são tratadas separadamente conforme o pagamento.</p>';
            box.classList.remove("hidden");
        }

        // ===== Fluxo de entrega: credenciais, confirmação do comprador e auto-conclusão =====

        // ===== Alerta WhatsApp ao admin: grava em public.notificacao (Supabase) e o vigia no servidor do admin envia pela Evolution API =====

        async function enviarAlertaLojaPorWhatsApp(titulo, mensagem) {
            const url = APP_CONFIG.SUPABASE_URL || document.querySelector('meta[name="supabase-url"]')?.content || "";
            const chave = APP_CONFIG.SUPABASE_PUBLISHABLE_KEY || document.querySelector('meta[name="supabase-key"]')?.content || "";
            if (!url || !chave) return false;
            try {
                const resp = await fetch(url.replace(/\/$/, "") + "/rest/v1/notificacao", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": chave,
                        "Authorization": "Bearer " + chave,
                        "Prefer": "return=minimal"
                    },
                    body: JSON.stringify({ titulo: String(titulo || "").slice(0, 200), mensagem: String(mensagem || "").slice(0, 3000) })
                });
                return resp.ok;
            } catch (e) {
                return false;
            }
        }

        function ofuscarTexto(txt) {
            const chave = "mkt2-acesso";
            let s = "";
            const fonte = String(txt || "");
            for (let i = 0; i < fonte.length; i++) {
                s += String.fromCharCode(fonte.charCodeAt(i) ^ chave.charCodeAt(i % chave.length));
            }
            return btoa(unescape(encodeURIComponent(s)));
        }

        function desofuscarTexto(txt) {
            if (!txt) return "";
            try {
                const raw = decodeURIComponent(escape(atob(txt)));
                const chave = "mkt2-acesso";
                let s = "";
                for (let i = 0; i < raw.length; i++) {
                    s += String.fromCharCode(raw.charCodeAt(i) ^ chave.charCodeAt(i % chave.length));
                }
                return s;
            } catch (e) {
                return "";
            }
        }

        function salvarAcessoVendedorLocal(anuncioId, gmail, senha) {
            if (!gmail && !senha) return;
            try {
                const mapa = JSON.parse(localStorage.getItem("marktplace_acessos_vendedor") || "{}");
                mapa[String(anuncioId)] = { g: ofuscarTexto(gmail), s: ofuscarTexto(senha), salvoEm: new Date().toISOString() };
                localStorage.setItem("marktplace_acessos_vendedor", JSON.stringify(mapa));
            } catch (e) {}
        }

        function chaveAcessoTicket(ticketId) {
            return "mkt_acesso_" + normalizarCodigoTicket(ticketId);
        }

        function salvarAcessoTicketLocal(ticketId, gmail, senha) {
            try {
                localStorage.setItem(chaveAcessoTicket(ticketId), JSON.stringify({
                    g: ofuscarTexto(gmail),
                    s: ofuscarTexto(senha),
                    salvoEm: new Date().toISOString()
                }));
            } catch (e) {}
        }

        function lerAcessoTicketLocal(ticketId) {
            try {
                const raw = localStorage.getItem(chaveAcessoTicket(ticketId));
                if (!raw) return null;
                const o = JSON.parse(raw);
                return { gmail: desofuscarTexto(o.g), senha: desofuscarTexto(o.s), salvoEm: o.salvoEm };
            } catch (e) {
                return null;
            }
        }

        function ticketChaveCss(ticketId) {
            return normalizarCodigoTicket(ticketId).replace(/[^A-Z0-9]/gi, "");
        }

        function salvarAcessoAdminTicket(ticketId) {
            if (!isAdminUsuario()) { mostrarAlerta("Admin", "Apenas a conta admin pode salvar dados de acesso.", "aviso"); return; }
            const k = ticketChaveCss(ticketId);
            const g = document.getElementById("acesso-gmail-" + k);
            const s = document.getElementById("acesso-senha-" + k);
            const gmail = g ? g.value.trim() : "";
            const senha = s ? s.value.trim() : "";
            if (!gmail && !senha) { mostrarAlerta("Aviso", "Preencha o Gmail e/ou a senha da conta.", "aviso"); return; }
            salvarAcessoTicketLocal(ticketId, gmail, senha);
            mostrarAlerta("Salvo", "Dados de acesso guardados criptografados neste navegador — nunca vão para o banco."); 
        }

        function copiarAcessoAdminTicket(ticketId) {
            if (!isAdminUsuario()) { mostrarAlerta("Admin", "Apenas a conta admin pode copiar dados.", "aviso"); return; }
            const acesso = lerAcessoTicketLocal(ticketId);
            if (!acesso || (!acesso.gmail && !acesso.senha)) { mostrarAlerta("Aviso", "Nenhum dado salvo para este ticket ainda.", "aviso"); return; }
            const texto = `Gmail: ${acesso.gmail || "(não informado)"}\nSenha: ${acesso.senha || "(não informado)"}`;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(texto).then(function() {
                    mostrarAlerta("Copiado", "Dados copiados — cole no e-mail/WhatsApp do comprador.");
                }).catch(function() { mostrarAlerta("Dados da Conta", texto); });
            } else {
                mostrarAlerta("Dados da Conta", texto);
            }
        }

        function todosChecksConfirmados() {
            const boxes = document.querySelectorAll(".chk-confirm-receb");
            return boxes.length ? Array.from(boxes).every(function(b) { return b.checked; }) : false;
        }

        async function confirmarRecebimentoComprador(ticketId) {
            if (!todosChecksConfirmados()) { mostrarAlerta("Antes de confirmar", "Marque as duas caixas para confirmar que está tudo certo com a conta.", "aviso"); return; }
            const codigo = normalizarCodigoTicket(ticketId);
            const pedido = (Array.isArray(pedidosAtivos) ? pedidosAtivos : []).find(function(p) { return p && normalizarCodigoTicket(p.ticketId) === codigo; });
            if (!pedido) { mostrarAlerta("Ops", "Ticket não encontrado — use o código no Rastreamento.", "aviso"); return; }
            if (!ticketPertenceAoUsuario(pedido)) { mostrarAlerta("Ops", "Somente o comprador deste pedido pode confirmar o recebimento.", "aviso"); return; }
            if (ticketConcluido(pedido)) { mostrarAlerta("Info", "Este ticket já está concluído.", "aviso"); return; }
            const statusTexto = "Concluído / Entregue (comprador confirmou — pagamento liberado ao vendedor)";
            pedido.etapa = 5;
            pedido.concluido = true;
            pedido.concluidoEm = new Date().toISOString();
            pedido.status = statusTexto;
            pedido.etapasCustodia = ETAPAS_CUSTODIA.slice(0, 5);
            try { localStorage.setItem("marktplace_stand2_pedidos", JSON.stringify(pedidosAtivos)); } catch (e) {}
            await atualizarEtapaTicketSupabase(codigo, 5, statusTexto, true);
            mostrarAlerta("Venda Concluída", "Obrigado! A venda foi concluída e o pagamento será liberado ao vendedor.");
            consultarStatusPedido();
        }

        let ticketContestacaoAtual = null;

        const TEXTOS_CONTESTACAO = {
            "2fa": (codigo) => `Olá, sou o comprador do ticket ${codigo}. Subi com os dados que recebi e a conta JÁ está com verificação em duas etapas (2FA) ativa — não consigo acessar. Aviso dentro do prazo de 24 horas: sei que a conta precisa ser devolvida limpa (sem 2FA e sem tentativa de recuperação de e-mail/senha), senão perco o direito ao reembolso. Preciso de solução imediata ou reembolso.`,
            "itens": (codigo) => `Olá, sou o comprador do ticket ${codigo}. Avisei dentro do prazo de 24 horas: entrei na conta e os itens NÃO são como no anúncio (estão faltando/diferentes). Peço verificação do anúncio pelo suporte. Se não for resolvido, quero o reembolso.`,
            "recuperada": (codigo) => `Olá, sou o comprador do ticket ${codigo}. Avisei dentro do prazo de 24 horas: a conta foi bloqueada ou recuperada pelo vendedor depois que recebi os dados. Perdi o acesso. Preciso do reembolso ou da devolução do acesso.`,
            "outro": (codigo) => `Olá, sou o comprador do ticket ${codigo}. Avisei dentro do prazo de 24 horas. Problema: `
        };

        function abrirContestacaoComprador(ticketId) {
            const codigo = normalizarCodigoTicket(ticketId);
            const pedido = (Array.isArray(pedidosAtivos) ? pedidosAtivos : []).find(function(p) { return p && normalizarCodigoTicket(p.ticketId) === codigo; });
            if (!pedido) { mostrarAlerta("Ops", "Ticket não encontrado — use o código no Rastreamento.", "aviso"); return; }
            if (!ticketPertenceAoUsuario(pedido)) { mostrarAlerta("Ops", "Somente o comprador deste pedido pode contestar.", "aviso"); return; }
            if (ticketConcluido(pedido)) { mostrarAlerta("Info", "Este ticket já está concluído; fale com o suporte.", "aviso"); return; }
            ticketContestacaoAtual = codigo;
            const sel = document.querySelector('input[name="contestacao-opcao"][value="2fa"]');
            if (sel) sel.checked = true;
            atualizarTextoContestacao();
            setModalVisivel("modal-contestacao", true);
        }

        function fecharContestacao() {
            setModalVisivel("modal-contestacao", false);
            ticketContestacaoAtual = null;
        }

        function atualizarTextoContestacao() {
            const checado = document.querySelector('input[name="contestacao-opcao"]:checked');
            const opcao = checado ? checado.value : "2fa";
            const gerador = TEXTOS_CONTESTACAO[opcao] || TEXTOS_CONTESTACAO["2fa"];
            document.getElementById("contestacao-texto").value = gerador(ticketContestacaoAtual);
        }

        async function confirmarContestacaoComprador() {
            const texto = (document.getElementById("contestacao-texto").value || "").trim();
            if (texto.length < 20) { mostrarAlerta("Antes de enviar", "Complete a descrição do problema antes de enviar.", "aviso"); return; }
            const codigo = ticketContestacaoAtual || normalizarCodigoTicket(texto);
            const pedido = (Array.isArray(pedidosAtivos) ? pedidosAtivos : []).find(function(p) { return p && normalizarCodigoTicket(p.ticketId) === codigo; });
            if (!pedido) { mostrarAlerta("Ops", "Ticket não encontrado — use o código no Rastreamento.", "aviso"); return; }
            const statusTexto = "Em contestação — prazo de conclusão pausado; suporte verificando";
            pedido.contestacao = true;
            pedido.status = statusTexto;
            try { localStorage.setItem("marktplace_stand2_pedidos", JSON.stringify(pedidosAtivos)); } catch (e) {}
            await atualizarEtapaTicketSupabase(codigo, etapaAtualDoPedido(pedido), statusTexto, false);
            enviarAlertaLojaPorWhatsApp(
                "⚠ CONTESTAÇÃO ABERTA — TICKET " + codigo,
                "Ticket: " + codigo + "\nCliente: " + (pedido.comprador || pedido.nome || "(sem nome)") + "\n\nMensagem do comprador:\n" + texto
            );
            fecharContestacao();
            closeRastreio();
            abrirChatSuporte();
            const input = document.getElementById("chat-input-texto");
            input.value = texto;
            enviarMensagemSuporte();
        }

        const PRAZO_AUTO_CONCLUSAO_MS = 24 * 60 * 60 * 1000;

        function formatarRestanteAuto(ms) {
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            return h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min`;
        }

        async function processarAutoConclusao() {
            let mudou = false;
            const copia = Array.isArray(pedidosAtivos) ? pedidosAtivos.slice() : [];
            for (const p of copia) {
                if (!p || p.concluido || p.contestacao) continue;
                if (etapaAtualDoPedido(p) < 4 || !p.entregaEm) continue;
                const entregaTs = new Date(p.entregaEm).getTime();
                if (!(entregaTs >= 0) || (Date.now() - entregaTs) < PRAZO_AUTO_CONCLUSAO_MS) continue;
                const statusTexto = "Concluído automaticamente — 24h sem contestação, pagamento liberado ao vendedor";
                p.etapa = 5;
                p.concluido = true;
                p.concluidoEm = new Date().toISOString();
                p.status = statusTexto;
                p.etapasCustodia = ETAPAS_CUSTODIA.slice(0, 5);
                try { localStorage.setItem("marktplace_stand2_pedidos", JSON.stringify(pedidosAtivos)); } catch (e) {}
                await atualizarEtapaTicketSupabase(normalizarCodigoTicket(p.ticketId), 5, statusTexto, true);
                mudou = true;
            }
            return mudou;
        }

        async function enviarCodigoGmail() {
            const email = document.getElementById("reg-email").value.trim();
            const feedback = document.getElementById("register-feedback");
            if (!email || !email.endsWith("@gmail.com")) { feedback.textContent = "Insira um Gmail válido."; return; }
            codigoEnviadoSimulado = gerarCodigoVerificacao(email);
            const enviado = await enviarCodigoPorEmail(email, codigoEnviadoSimulado);
            feedback.style.color = "#10b981";
            feedback.textContent = enviado ? "Código enviado para o seu Gmail! Confira a caixa de entrada." : `Código enviado! (Código: ${codigoEnviadoSimulado})`;
            const area = document.getElementById("reg-codigo-area");
            if (area) area.classList.remove("hidden");
            const campoCodigo = document.getElementById("reg-code");
            if (campoCodigo) campoCodigo.focus();
        }

        async function handleRegister(event) {
            event.preventDefault();
            const email = document.getElementById("reg-email").value.trim();
            const whatsapp = document.getElementById("reg-whatsapp").value.trim();
            const codigoInput = document.getElementById("reg-code").value.trim();
            let username = document.getElementById("reg-username").value.trim();
            const password = document.getElementById("reg-password").value;
            const passwordConfirm = document.getElementById("reg-password-confirm").value;
            const feedback = document.getElementById("register-feedback");

            if (codigoInput !== codigoEnviadoSimulado) { feedback.textContent = "Código incorreto!"; return; }
            if (password.length < 6 || password !== passwordConfirm) { feedback.textContent = "Senhas inválidas ou não conferem."; return; }

            if (!username) username = `Player_${Math.floor(1000 + Math.random() * 9000)}`;
            let users = JSON.parse(localStorage.getItem("marktplace_stand2_db_users") || "[]");
            if (users.some(u => normalizarIdentificador(u.email) === normalizarIdentificador(email))) { feedback.textContent = "Gmail já cadastrado."; return; }
            if (users.some(u => normalizarIdentificador(u.username) === normalizarIdentificador(username))) { feedback.textContent = "Este nome de usuário já está em uso."; return; }

            feedback.textContent = "Verificando disponibilidade no Supabase...";
            const existente = await buscarUsuarioSupabase(email);
            if (existente) { feedback.textContent = "Gmail já cadastrado."; return; }
            if (await verificarNomeEmUso(username, email)) { feedback.textContent = "Este nome de usuário já está em uso."; return; }

            const avatar = document.getElementById("selected-avatar").value || AVATARES[0];
            const ehAdminNoCadastro = ehEmailAdmin(email);
            const emailNormalizado = email.toLowerCase();
            const senhaHash = await hashSenha(password);
            users.push({ email: emailNormalizado, whatsapp, username, password: senhaHash, avatar, isAdmin: ehAdminNoCadastro });
            localStorage.setItem("marktplace_stand2_db_users", JSON.stringify(users));

            await cadastrarUsuarioSupabase({ email: emailNormalizado, nome: username, senha: senhaHash, avatar: avatar, whatsapp: whatsapp || "", ultimo_ajuste_nome: null });

            currentUser = { username, email: emailNormalizado, whatsapp, password: senhaHash, avatar, isAdmin: ehAdminNoCadastro };
            localStorage.setItem("marktplace_stand2_user", JSON.stringify(currentUser));
            aplicarEstadoUsuario();
            closeModal();
            mostrarAlerta("Sucesso!", "Conta criada com sucesso! Bem-vindo ao MARKTPLACE stand2.");
        }

        async function handleLogin(event) {
            event.preventDefault();
            const identifier = document.getElementById("login-identifier").value.trim();
            const password = document.getElementById("login-password").value;
            const feedback = document.getElementById("login-feedback");
            let users = JSON.parse(localStorage.getItem("marktplace_stand2_db_users") || "[]");
            const idLower = identifier.toLowerCase();
            let foundUser = null;
            for (const u of users) {
                if (((u.email || "").toLowerCase() === idLower || (u.username || "").toLowerCase() === idLower) && (await conferirSenha(password, u.password))) { foundUser = u; break; }
            }

            if (!foundUser && ADMIN_SENHA_DIRETA && identifier.toLowerCase() === ADMIN_EMAIL && password === ADMIN_SENHA_DIRETA) {
                foundUser = { email: ADMIN_EMAIL, whatsapp: "", username: "Admin", password: ADMIN_SENHA_DIRETA, avatar: AVATARES[0], isAdmin: true };
                users.push(foundUser);
                localStorage.setItem("marktplace_stand2_db_users", JSON.stringify(users));
            }

            if (!foundUser && window.supabaseClient) {
                feedback.textContent = "Verificando sua conta no Supabase...";
                const row = await buscarUsuarioSupabase(identifier);
                if (row && row.senha && (await conferirSenha(password, row.senha))) {
                    await migrarSenhaLegada(row.email, password, row.senha);
                    foundUser = { email: row.email, whatsapp: row.whatsapp || "", username: row.nome, password: await hashSenha(password), avatar: row.avatar || AVATARES[0], isAdmin: ehEmailAdmin(row.email) };
                    users.push(foundUser);
                    localStorage.setItem("marktplace_stand2_db_users", JSON.stringify(users));
                }
            }

            if (!foundUser) { feedback.textContent = "Dados incorretos."; return; }
            const ehAdminNoLogin = foundUser.email && ehEmailAdmin(foundUser.email);
            currentUser = { username: sanitizarNomePublico(foundUser.username), email: foundUser.email, whatsapp: foundUser.whatsapp || "(Não informado)", password: foundUser.password, avatar: foundUser.avatar, isAdmin: ehAdminNoLogin };
            localStorage.setItem("marktplace_stand2_user", JSON.stringify(currentUser));
            aplicarEstadoUsuario();
            closeModal();
        }

        function aplicarEstadoUsuario() {
            const userPanel = document.getElementById("userPanel");
            const loginBtnContainer = document.getElementById("loginButtonContainer");
            if (currentUser) {
                userPanel.classList.remove("hidden");
                loginBtnContainer.classList.add("hidden");
                document.getElementById("user-avatar-img").src = currentUser.avatar;
                document.getElementById("user-name-text").textContent = sanitizarNomePublico(currentUser.username) + (currentUser.isAdmin || isAdminUsuario() ? " • Admin" : "");
            } else {
                userPanel.classList.add("hidden");
                loginBtnContainer.classList.remove("hidden");
            }
            const menuItemBanidos = document.getElementById("menu-item-banidos");
            if (menuItemBanidos) menuItemBanidos.classList.toggle("hidden", !isAdminUsuario());
            const menuItemConfig = document.getElementById("menu-item-config");
            if (menuItemConfig) menuItemConfig.classList.toggle("hidden", !currentUser);
            carregarCatalogo();
        }

        function logout() {
            currentUser = null;
            localStorage.removeItem("marktplace_stand2_user");
            aplicarEstadoUsuario();
            fecharMenuMobile();
            mostrarAlerta("Sessão Encerrada", "Você saiu com sucesso.");
        }

        async function buscarUsuarioSupabase(identificador) {
            if (!window.supabaseClient || !identificador) return null;
            try {
                const id = normalizarIdentificador(identificador);
                let consulta = window.supabaseClient.from("usuarios").select("*");
                consulta = id.includes("@") ? consulta.eq("email", id) : consulta.ilike("nome", id);
                const { data, error } = await consulta.maybeSingle();
                if (error || !data) return null;
                return data;
            } catch (e) {
                return null;
            }
        }
        function normalizarIdentificador(texto) {
            return String(texto || "").trim().toLowerCase();
        }

        // ===== Senhas: persistem como hash (prefixo h$); senhas antigas em texto puro são conferidas e migradas no login =====
        async function hashSenha(texto) {
            const bruto = "mkt2$1|" + String(texto || "");
            try {
                if (window.crypto && window.crypto.subtle && window.isSecureContext) {
                    const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(bruto));
                    return "h$" + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
                }
            } catch (e) {}
            return bruto;
        }

        async function conferirSenha(tentativa, armazenada) {
            if (!armazenada) return false;
            const h = await hashSenha(tentativa);
            if (h === String(armazenada)) return true;
            if (!String(armazenada).startsWith("h$")) return String(tentativa || "") === String(armazenada);
            return false;
        }

        async function migrarSenhaLegada(email, tentativa, armazenada) {
            try {
                if (armazenada && !String(armazenada).startsWith("h$")) await atualizarUsuarioSupabase(email, { senha: await hashSenha(tentativa) });
            } catch (e) {}
        }

        async function cadastrarUsuarioSupabase(registro) {
            if (!window.supabaseClient || !registro || !registro.email) return false;
            try {
                const { error } = await window.supabaseClient.from("usuarios").insert([registro]);
                return !error;
            } catch (e) {
                return false;
            }
        }

        async function verificarNomeEmUso(nome, ignorarEmail) {
            if (!window.supabaseClient || !nome) return false;
            try {
                const { data, error } = await window.supabaseClient.from("usuarios").select("email").ilike("nome", nome);
                if (error || !Array.isArray(data)) return false;
                return data.some(r => normalizarIdentificador(r.email) !== normalizarIdentificador(ignorarEmail));
            } catch (e) {
                return false;
            }
        }

        async function atualizarUsuarioSupabase(email, campos) {
            if (!window.supabaseClient || !email || !campos) return false;
            try {
                const { data, error } = await window.supabaseClient.from("usuarios").update(campos).eq("email", normalizarIdentificador(email)).select("email");
                return !error && Array.isArray(data) && data.length > 0;
            } catch (e) {
                return false;
            }
        }

        function sincronizarUsuarioLocal(usuarioLocal) {
            try {
                const users = JSON.parse(localStorage.getItem("marktplace_stand2_db_users") || "[]");
                const indice = users.findIndex(u => normalizarIdentificador(u.email) === normalizarIdentificador(usuarioLocal.email));
                if (indice >= 0) { users[indice] = Object.assign({}, users[indice], usuarioLocal); } else { users.push(usuarioLocal); }
                localStorage.setItem("marktplace_stand2_db_users", JSON.stringify(users));
            } catch (e) {}
        }

        let recSenhaCodigo = null;
        let recSenhaExpiraEm = 0;
        let recSenhaEmailConta = null;

        function mostrarRecuperacaoSenha() {
            const area = document.getElementById("rec-senha-area");
            if (area) { area.classList.remove("hidden"); const campo = document.getElementById("rec-identifier"); if (campo) campo.focus(); }
            document.getElementById("login-feedback").textContent = "";
        }

        async function gerarCodigoRecuperacao() {
            const identificador = document.getElementById("rec-identifier").value.trim();
            const feedback = document.getElementById("rec-feedback");
            const caixa = document.getElementById("rec-codigo-box");
            feedback.style.color = "#f87171";
            feedback.textContent = "";
            if (!identificador) { feedback.textContent = "Informe seu Gmail ou Nome de usuário."; return; }
            let row = await buscarUsuarioSupabase(identificador);
            if (!row) {
                const users = JSON.parse(localStorage.getItem("marktplace_stand2_db_users") || "[]");
                const local = users.find(u => normalizarIdentificador(u.email) === normalizarIdentificador(identificador) || normalizarIdentificador(u.username) === normalizarIdentificador(identificador));
                if (local) row = { email: local.email, nome: local.username };
            }
            if (!row || !row.email) { caixa.classList.add("hidden"); feedback.textContent = "Conta não encontrada. Confira o Gmail ou Nome digitado."; return; }
            recSenhaCodigo = String(Math.floor(100000 + Math.random() * 900000));
            recSenhaEmailConta = normalizarIdentificador(row.email);
            recSenhaExpiraEm = Date.now() + 5 * 60 * 1000;
            document.getElementById("rec-codigo-valor").textContent = recSenhaCodigo;
            caixa.classList.remove("hidden");
            document.getElementById("rec-nova-senha-area").classList.remove("hidden");
            feedback.style.color = "#10b981";
            feedback.textContent = "Código gerado na caixa acima. Digite-o e defina a nova senha (5 min).";
        }

        async function confirmarRecuperacaoSenha() {
            const feedback = document.getElementById("rec-feedback");
            feedback.style.color = "#f87171";
            const codigo = document.getElementById("rec-code-input").value.trim();
            const nova = document.getElementById("rec-nova-senha").value;
            const conf = document.getElementById("rec-nova-senha-confirm").value;
            if (!recSenhaCodigo || Date.now() > recSenhaExpiraEm) { feedback.textContent = "Código expirado. Gere um novo."; return; }
            if (codigo !== recSenhaCodigo) { feedback.textContent = "Código incorreto."; return; }
            if (nova.length < 6 || nova !== conf) { feedback.textContent = "Nova senha inválida ou não confere."; return; }
            const okBanco = await atualizarUsuarioSupabase(recSenhaEmailConta, { senha: await hashSenha(nova) });
            sincronizarUsuarioLocal({ email: recSenhaEmailConta, password: await hashSenha(nova) });
            if (okBanco) {
                feedback.style.color = "#10b981";
                feedback.textContent = "Senha redefinida com sucesso! Faça login com a nova senha.";
                ["rec-identifier", "rec-code-input", "rec-nova-senha", "rec-nova-senha-confirm"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
                recSenhaCodigo = null; recSenhaEmailConta = null;
            } else {
                feedback.textContent = "Não foi possível gravar no Supabase agora. Tente novamente em instantes.";
            }
        }

        function abrirConfiguracoes() {
            fecharMenuMobile();
            if (!currentUser) { mostrarAlerta("Atenção", "Entre na sua conta para abrir as Configurações.", "aviso"); openModal(); return; }
            document.getElementById("config-avatar-img").src = currentUser.avatar || AVATARES[0];
            document.getElementById("config-nome").textContent = sanitizarNomePublico(currentUser.username);
            document.getElementById("config-email").textContent = currentUser.email || "—";
            document.getElementById("config-novo-nome").value = "";
            document.getElementById("config-whatsapp").value = (currentUser.whatsapp && currentUser.whatsapp !== "(Não informado)") ? currentUser.whatsapp : "";
            ["config-senha-antiga", "config-senha-nova", "config-senha-nova-confirm"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
            carregarAvataresConfig();
            feedbackConfig("", "");
            setModalVisivel("modal-config", true);
        }
        function closeConfiguracoes() { setModalVisivel("modal-config", false); }
        function feedbackConfig(texto, cor) {
            const f = document.getElementById("config-feedback");
            if (!f) return;
            f.style.color = cor || "";
            f.textContent = texto;
        }

        function carregarAvataresConfig() {
            const grid = document.getElementById("config-avatars-grid");
            if (!grid) return;
            grid.innerHTML = "";
            AVATARES.forEach((url) => {
                const img = document.createElement("img");
                img.src = url;
                img.className = "w-10 h-10 rounded-full cursor-pointer border-2 p-1 bg-[#050505] transition " + (currentUser.avatar === url ? "border-[var(--accent)]" : "border-transparent hover:border-[var(--accent)]");
                img.onclick = function() { aplicarAvatarUsuario(url); };
                grid.appendChild(img);
            });
        }

        async function aplicarAvatarUsuario(avatarUrl) {
            if (!currentUser) return;
            currentUser.avatar = avatarUrl;
            localStorage.setItem("marktplace_stand2_user", JSON.stringify(currentUser));
            sincronizarUsuarioLocal({ email: currentUser.email, avatar: avatarUrl });
            document.getElementById("user-avatar-img").src = avatarUrl;
            document.getElementById("config-avatar-img").src = avatarUrl;
            carregarAvataresConfig();
            const okBanco = await atualizarUsuarioSupabase(currentUser.email, { avatar: avatarUrl });
            feedbackConfig(okBanco ? "Avatar atualizado!" : "Avatar aplicado localmente (Supabase indisponível).", okBanco ? "#10b981" : "#fbbf24");
        }

        function comprimirImagemAvatar(file) {
            return new Promise((resolve) => {
                if (!file) { resolve(null); return; }
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        try {
                            const canvas = document.createElement("canvas");
                            let w = img.width, h = img.height;
                            if (w > h) { h = Math.max(1, Math.round(200 * h / w)); w = 200; } else { w = Math.max(1, Math.round(200 * w / h)); h = 200; }
                            canvas.width = w || 200;
                            canvas.height = h || 200;
                            canvas.getContext("2d").drawImage(img, 0, 0, w || 200, h || 200);
                            resolve(canvas.toDataURL("image/jpeg", 0.7));
                        } catch (err) { resolve(null); }
                    };
                    img.onerror = () => resolve(null);
                    img.src = e.target.result;
                };
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });
        }

        async function salvarAvatarUpload(file) {
            if (!currentUser) return;
            feedbackConfig("Processando imagem...", "#9ca3af");
            const base64 = await comprimirImagemAvatar(file);
            if (!base64) { feedbackConfig("Falha ao processar a imagem. Tente outro arquivo.", "#f87171"); return; }
            await aplicarAvatarUsuario(base64);
        }

        async function salvarNovoNomeConfig() {
            if (!currentUser) return;
            const novoNome = document.getElementById("config-novo-nome").value.trim();
            if (!novoNome || novoNome.length < 3) { feedbackConfig("Informe um nome com pelo menos 3 caracteres.", "#f87171"); return; }
            feedbackConfig("Verificando regra de 30 dias no Supabase...", "#9ca3af");
            const row = await buscarUsuarioSupabase(currentUser.email);
            const ultimo = row ? row.ultimo_ajuste_nome : null;
            if (ultimo) {
                const decorrido = Date.now() - new Date(ultimo).getTime();
                const diasRestantes = 30 - Math.floor(decorrido / 86400000);
                if (diasRestantes > 0) { feedbackConfig(`Você só pode trocar o nome a cada 30 dias. Faltam ${diasRestantes} dia(s).`, "#fbbf24"); return; }
            }
            if (await verificarNomeEmUso(novoNome, currentUser.email)) { feedbackConfig("Este nome já está em uso por outro usuário.", "#f87171"); return; }
            const agora = new Date().toISOString();
            const okBanco = await atualizarUsuarioSupabase(currentUser.email, { nome: novoNome, ultimo_ajuste_nome: agora });
            currentUser.username = novoNome;
            localStorage.setItem("marktplace_stand2_user", JSON.stringify(currentUser));
            sincronizarUsuarioLocal({ email: currentUser.email, username: novoNome });
            document.getElementById("config-nome").textContent = sanitizarNomePublico(novoNome);
            document.getElementById("config-novo-nome").value = "";
            aplicarEstadoUsuario();
            feedbackConfig(okBanco ? "Nome atualizado! Próxima troca liberada em 30 dias." : "Nome atualizado localmente (Supabase indisponível).", okBanco ? "#10b981" : "#fbbf24");
        }

        async function salvarWhatsAppConfig() {
            if (!currentUser) return;
            const wpp = document.getElementById("config-whatsapp").value.trim().replace(/\D/g, "");
            if (!wpp || wpp.length < 10) { feedbackConfig("Informe um número válido com DDD (ex: 11999999999).", "#f87171"); return; }
            feedbackConfig("Salvando WhatsApp...", "#9ca3af");
            const okBanco = await atualizarUsuarioSupabase(currentUser.email, { whatsapp: wpp });
            currentUser.whatsapp = wpp;
            localStorage.setItem("marktplace_stand2_user", JSON.stringify(currentUser));
            sincronizarUsuarioLocal({ email: currentUser.email, whatsapp: wpp });
            feedbackConfig(okBanco ? "WhatsApp salvo! Ele pré-preencherá o checkout/suporte." : "WhatsApp salvo localmente (Supabase indisponível).", okBanco ? "#10b981" : "#fbbf24");
        }

        async function salvarNovaSenhaConfig() {
            if (!currentUser) return;
            const antiga = document.getElementById("config-senha-antiga").value;
            const nova = document.getElementById("config-senha-nova").value;
            const conf = document.getElementById("config-senha-nova-confirm").value;
            if (nova.length < 6) { feedbackConfig("A nova senha precisa ter pelo menos 6 caracteres.", "#f87171"); return; }
            if (nova !== conf) { feedbackConfig("A confirmação não confere com a nova senha.", "#f87171"); return; }
            feedbackConfig("Validando senha antiga no Supabase...", "#9ca3af");
            const row = await buscarUsuarioSupabase(currentUser.email);
            const senhaAtual = row ? row.senha : currentUser.password;
            if (!(await conferirSenha(antiga, senhaAtual))) { feedbackConfig("Senha antiga incorreta.", "#f87171"); return; }
            const okBanco = await atualizarUsuarioSupabase(currentUser.email, { senha: await hashSenha(nova) });
            currentUser.password = await hashSenha(nova);
            localStorage.setItem("marktplace_stand2_user", JSON.stringify(currentUser));
            sincronizarUsuarioLocal({ email: currentUser.email, password: nova });
            ["config-senha-antiga", "config-senha-nova", "config-senha-nova-confirm"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
            feedbackConfig(okBanco ? "Senha atualizada com sucesso!" : "Senha atualizada localmente (Supabase indisponível).", okBanco ? "#10b981" : "#fbbf24");
        }
