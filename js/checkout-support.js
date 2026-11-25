        function gerarQrCodePagamento() {
            closeCheckout();
            let totalCarrinhoStr = "R$ 0,00";
            let nomesContas = carrinhoItens.map(i => i.titulo).join(", ");
            if (!nomesContas && anuncioSelecionadoAtual) nomesContas = anuncioSelecionadoAtual.titulo;
            let somaTotal = 0;
            carrinhoItens.forEach(item => {
                let p = parseFloat(item.preco.replace("R$", "").replace(".", "").replace(",", ".").trim()) || 0;
                somaTotal += p;
            });
            if (somaTotal === 0 && anuncioSelecionadoAtual) {
                somaTotal = parseFloat(anuncioSelecionadoAtual.preco.replace("R$", "").replace(".", "").replace(",", ".").trim()) || 0;
            }
            totalCarrinhoStr = `R$ ${somaTotal.toFixed(2).replace(".", ",")}`;
            const metodoEscolhido = document.querySelector('input[name="pagamento"]:checked').value;
            document.getElementById("pedido-codigo").textContent = `Pedido #SO2-${Math.floor(1000 + Math.random() * 9000)}`;
            document.getElementById("pag-conta-nome").textContent = nomesContas || "Conta Standoff 2";
            document.getElementById("pag-conta-valor").textContent = totalCarrinhoStr;
            const conteudoPag = document.getElementById("pag-conteudo");
            if (metodoEscolhido === "pix") {
                const pixStr = `00020126580014br.gov.bcb.pix0136so2-${Date.now()}5204000053039865802BR5913SAFE6009SP62070503***6304`;
                conteudoPag.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pixStr)}" alt="QR Code PIX" class="mx-auto bg-white p-1 rounded mb-2"><p class="text-[11px] text-gray-400">Escaneie o QR Code ou use o PIX Copia e Cola.</p>`;
            } else {
                conteudoPag.innerHTML = `<div class="py-4 text-emerald-400 font-bold text-sm">💳 Cartão de Crédito Autorizado com Sucesso!</div><p class="text-[11px] text-gray-400">Clique abaixo para gerar o seu ticket e liberar os dados de acesso.</p>`;
            }
            setModalVisivel("modal-pagamento-detalhes", true);
        }

        function closePagamentoDetalhes() { setModalVisivel("modal-pagamento-detalhes", false); }

        async function enviarComprovanteParaTicket() {
            closePagamentoDetalhes();
            const ticketIdGerado = "TICK-" + Math.floor(10000 + Math.random() * 90000);
            const pedidoIdGerado = "SO2-" + Math.floor(1000 + Math.random() * 9000);
            var totalCompraTexto = (document.getElementById("pag-conta-valor") || {}).textContent || "0";
            var totalCompraNum = parseFloat(String(totalCompraTexto).replace("R$", "").replace(".", "").replace(",", ".")) || 0;
            eventosGtag("purchase", { currency: "BRL", value: totalCompraNum, transaction_id: pedidoIdGerado });
            const metodoRadios = document.querySelectorAll('input[name="pagamento"]');
            let metodoValor = "pix";
            metodoRadios.forEach(r => { if (r.checked) metodoValor = r.value; });
            const metodoPagamento = metodoValor === "cartao" ? "Cartão de Crédito" : "PIX";
            document.getElementById("ticket-id").textContent = `Ticket #${ticketIdGerado}`;
            const destaqueCodigo = document.getElementById("ticket-codigo-destaque-valor");
            if (destaqueCodigo) destaqueCodigo.textContent = ticketIdGerado;
            let gmailUser = currentUser ? currentUser.email : "cliente@gmail.com";
            let wppUser = currentUser ? currentUser.whatsapp : "(Não informado)";
            document.getElementById("ticket-info-gmail").textContent = gmailUser;
            document.getElementById("ticket-info-wpp").textContent = wppUser;
            let nomesItens = carrinhoItens.map(i => i.titulo) || [];
            const listaItensFormatada = Array.isArray(nomesItens)
                ? nomesItens.filter(Boolean).join(", ")
                : String(nomesItens || "").trim();
            let valorTotalPedido = document.getElementById("pag-conta-valor").textContent;
            pedidosAtivos.unshift({
                ticketId: ticketIdGerado,
                pedidoId: pedidoIdGerado,
                comprador: gmailUser,
                status: "Aprovado • Custódia Segura",
                itens: listaItensFormatada,
                total: valorTotalPedido,
                etapasCustodia: [ETAPAS_CUSTODIA[0]]
            });
            localStorage.setItem("marktplace_stand2_pedidos", JSON.stringify(pedidosAtivos));
            await salvarTicketSupabase({
                codigo: ticketIdGerado,
                comprador_email: String(gmailUser || "").toLowerCase() === "cliente@gmail.com" ? "" : String(gmailUser || "").toLowerCase(),
                comprador_nome: currentUser ? sanitizarNomePublico(currentUser.username) : "Visitante",
                comprador_whatsapp: wppUser || "",
                itens: listaItensFormatada || "",
                valor_total: valorTotalPedido || "",
                metodo_pagamento: metodoPagamento,
                etapa: 1,
                status_texto: "Pagamento retido pelo site (custódia segura)",
                concluido: false
            });
            const statusKey = "aguardando_conta_vendedor";
            const resumoRapido = montarResumoRapidoTicket({
                ticketId: ticketIdGerado,
                statusKey,
                itensResumo: listaItensFormatada || "Item do catálogo",
                compradorEmail: gmailUser,
                compradorWhats: wppUser
            });
            const chatBox = document.getElementById("chat-mensagens");
            chatBox.innerHTML += `<div class="bg-[#050505] border border-[#26211a] rounded-xl p-3 text-gray-300 max-w-[90%] space-y-1"><p class="font-bold text-[var(--accent)]">🤖 Bot de Entrega Automática</p><p class="text-[11px] text-emerald-400 font-semibold">✓ Pagamento e Comprovante Aprovados!</p>${resumoRapido}</div>`;
            chatBox.scrollTop = chatBox.scrollHeight;
            setModalVisivel("modal-ticket", true);
            carrinhoItens = [];
            localStorage.removeItem("marktplace_stand2_cart");
            atualizarBadgeCarrinho();
        }

        function closeTicketModal() { setModalVisivel("modal-ticket", false); }

        function abrirChatSuporte() {
            closeTicketModal();
            setModalVisivel("modal-chat-suporte", true);
            const chatMenu = document.getElementById("chat-mensagens");
            if (chatMenu && !chatMenu.querySelector("[data-menu-bot]")) {
                chatMenu.innerHTML += construirMenuBot().replace('<div class="bg-[#050505] border border-[#26211a] rounded-xl p-2.5 max-w-[90%]"', '<div data-menu-bot class="bg-[#050505] border border-[#26211a] rounded-xl p-2.5 max-w-[90%]"');
                chatMenu.scrollTop = chatMenu.scrollHeight;
            }
        }

        function closeChatSuporte() { setModalVisivel("modal-chat-suporte", false); }

        function classificarAssuntoSuporte(texto) {
            const t = (texto || "").toLowerCase();
            if (!t) return null;
            const ticketNaMensagem = (texto.match(/TICK-\d+/i) || [""])[0].toUpperCase();
            const ticketSessao = (!ticketNaMensagem && Array.isArray(pedidosAtivos) && pedidosAtivos[0]) ? String(pedidosAtivos[0].ticketId).toUpperCase() : "";
            const ticket = ticketNaMensagem || ticketSessao;
            const regras = [
                ["suporte_humano", /suporte|atendimento|atendente|falar com (o |a |algu|equipe)/],
                ["pagamento", /pagamento|comprovante|cobran|pix|cart[aã]o|estorn|reembols|devolu|refund/],
                ["entrega_rastreio", /entrega|entregue|dados da conta|recebi a conta|rastrei|ticket|tick-\d+|TICK-\d|status do (meu )?pedido/],
                ["acesso_conta", /login|logar|entrar na conta|senha|c[oó]digo|banido|banimento|bloquead|den[uú]ncia|denunciar|golpe|suspeita|fraude|hacker/]
            ];
            for (const [assunto, re] of regras) {
                if (re.test(t)) return { assunto: assunto, ticket: ticket };
            }
            return null;
        }

        function registrarDisparoWhatsApp(assunto) {
            const agora = Date.now();
            let registros = {};
            try { registros = JSON.parse(sessionStorage.getItem(CHAVE_STORAGE_WPP_COOLDOWN) || "{}"); } catch (e) { registros = {}; }
            if (typeof registros !== "object" || registros === null) registros = {};
            const ultimo = Number(registros[assunto] || 0);
            if (agora - ultimo < WHATSAPP_ALERTA_COOLDOWN_MS) return false;
            registros[assunto] = agora;
            sessionStorage.setItem(CHAVE_STORAGE_WPP_COOLDOWN, JSON.stringify(registros));
            return true;
        }

        function montarMensagemAlertaWhatsApp(assunto, ticket, mensagem) {
            const origem = "MARKTPLACE stand2 (Suporte)";
            const usuario = currentUser ? `${sanitizarNomePublico(currentUser.username)} (${currentUser.email})` : "Visitante";
            return [
                `[ALERTA] ${origem}`,
                `Usuario: ${usuario}`,
                `Ticket: ${ticket || "(nenhum)"}`,
                `Assunto: ${assunto}`,
                `Mensagem: ${mensagem}`
            ].join("\n");
        }

        function mostrarToastWhatsAppAdmin(url) {
            const antigo = document.getElementById("toast-whatsapp-admin");
            if (antigo) antigo.remove();
            const toast = document.createElement("div");
            toast.id = "toast-whatsapp-admin";
            toast.style.cssText = "position:fixed;bottom:90px;left:16px;right:16px;margin:0 auto;max-width:420px;z-index:100000;background:#16130e;border:2px solid rgba(245,158,11,.6);border-radius:16px;padding:14px;box-shadow:0 8px 24px rgba(0,0,0,.6);";
            toast.innerHTML = '<p style="margin:0 0 8px;font-size:12px;font-weight:800;color:#f59e0b;">🔔 Novo acionamento de suporte</p><p style="margin:0 0 10px;font-size:11px;color:#d1d5db;line-height:1.4;">Toque para avisar o admin no WhatsApp — a mensagem já vai pronta.</p><a href="' + url + '" target="_blank" rel="noopener" style="display:block;text-align:center;padding:10px;border-radius:12px;background:#f59e0b;color:#000;font-size:12px;font-weight:bold;text-decoration:none;">📲 Abrir WhatsApp</a>';
            document.body.appendChild(toast);
            setTimeout(function() { const t = document.getElementById("toast-whatsapp-admin"); if (t) t.remove(); }, 120000);
        }

        function dispararAlertaWhatsAppAdmin(assunto, ticket, mensagem) {
            if (!ADMIN_WHATSAPP) return false;
            if (!registrarDisparoWhatsApp(assunto)) return false;
            const url = "https://wa.me/" + ADMIN_WHATSAPP + "?text=" + encodeURIComponent(montarMensagemAlertaWhatsApp(assunto, ticket, mensagem));
            const chat = document.getElementById("chat-mensagens");
            if (chat) {
                chat.innerHTML += `<div class="bg-[#050505] border border-[#2f2920] rounded-xl p-2.5 text-gray-300 max-w-[90%]"><p class="font-bold text-[var(--accent)]">Bot Oficial</p>O suporte intermediário foi acionado. Toque abaixo para avisar o admin no WhatsApp:<a href="${url}" target="_blank" rel="noopener" class="block text-center mt-2 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-black no-underline">📲 Acionar Suporte no WhatsApp</a></div>`;
                chat.scrollTop = chat.scrollHeight;
            }
            mostrarToastWhatsAppAdmin(url);
            return true;
        }

        const OPCOES_MENU_BOT = [
            { numero: 1, rotulo: "Rastrear pedido / Ticket", resposta: "Digite o codigo do seu ticket (ex: TICK-12345) aqui no chat ou use o menu 'Rastrear Pedido' para consultar o status e as etapas de custodia." },
            { numero: 2, rotulo: "Intermediacao / custodia", resposta: "A custodia funciona assim: o pagamento fica retido pelo site e liberado ao vendedor somente apos a entrega confirmada da conta. Sem chat direto entre comprador e vendedor." },
            { numero: 3, rotulo: "Duvidas de pagamento", resposta: "Comprovantes, cobrancas e estornos sao tratados pelo admin manualmente. Se o pagamento ja foi feito, acione o suporte no WhatsApp que o admin recebe um alerta." },
            { numero: 4, rotulo: "Anunciar conta", resposta: "Use o menu 'Anunciar Conta': faca login, envie os prints do inventario (o site le os itens automaticamente), preencha titulo e preco e publique." },
            { numero: 5, rotulo: "Login / codigo Gmail / conta", resposta: "O codigo de verificacao chega por Gmail (EmailJS). Nao recebeu? Verifique o spam ou acione o suporte no WhatsApp pelo chat." },
            { numero: 6, rotulo: "Suporte oficial", resposta: "Acionando o suporte oficial: o admin foi avisado no WhatsApp. Toque no botao acima ou descreva melhor o problema aqui no chat." }
        ];

        function construirMenuBot() {
            const Itens = OPCOES_MENU_BOT.map(o => `<button type="button" onclick="escolherOpcaoBot(${o.numero}, '${escapeHtml(o.rotulo)}')" class="block w-full text-left text-left bg-[#1c1812] hover:bg-[#26211a] border border-[#2f2920] rounded-xl px-3 py-2 text-white cursor-pointer"><span class="text-[var(--accent)] font-bold">${o.numero}.</span> ${escapeHtml(o.rotulo)}</button>`).join("");
            return `<div class="bg-[#050505] border border-[#26211a] rounded-xl p-2.5 max-w-[90%]"><p class="font-bold text-[var(--accent)] mb-1.5">Bot Oficial</p><p class="text-gray-300 mb-2">Como posso ajudar? Escolha uma opcao ou digite sua mensagem:</p><div class="space-y-1.5">${Itens}</div></div>`;
        }

        function escolherOpcaoBot(numero, rotulo) {
            const chat = document.getElementById("chat-mensagens");
            if (!chat) return;
            const opcao = OPCOES_MENU_BOT.find(o => o.numero === numero);
            const textoUsuario = `${numero}. ${rotulo}`;
            chat.innerHTML += `<div class="bg-[#1c1812] border border-[#2f2920] rounded-xl p-2.5 text-white ml-auto max-w-[85%] text-right"><p class="font-bold text-[var(--accent)]">Você</p>${escapeHtml(textoUsuario)}</div>`;
            chat.scrollTop = chat.scrollHeight;
            const classificacao = (!isAdminUsuario()) ? classificarAssuntoSuporte(rotulo) : null;
            if (classificacao) { setTimeout(() => dispararAlertaWhatsAppAdmin(classificacao.assunto, classificacao.ticket, textoUsuario), 200); }
            setTimeout(async () => {
                let respostaFinal;
                if (opcao && opcao.numero === 1) {
                    try { respostaFinal = await respostaOpcaoRastrear(); } catch (e) { respostaFinal = opcao.resposta; }
                } else {
                    respostaFinal = (opcao ? opcao.resposta : "");
                }
                chat.innerHTML += `<div class="bg-[#050505] border border-[#26211a] rounded-xl p-2.5 text-gray-300 max-w-[85%] whitespace-pre-line"><p class="font-bold text-[var(--accent)]">Bot Oficial</p>${escapeHtml(respostaFinal)}</div>`;
                chat.scrollTop = chat.scrollHeight;
            }, 600);
        }

        function normalizarCodigoTicket(texto) {
            return String(texto || "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
        }

        async function salvarTicketSupabase(registro) {
            if (!window.supabaseClient || !registro || !registro.codigo) return false;
            try {
                const { error } = await window.supabaseClient.from("tickets").insert([registro]);
                if (error) { return false; }
                return true;
            } catch (e) {
                return false;
            }
        }

        function converterRegistroSupabase(row) {
            const etapa = Math.min(5, Math.max(1, Number(row.etapa) || 1));
            return {
                ticketId: String(row.codigo || "").toUpperCase(),
                pedidoId: String(row.codigo || "").toUpperCase(),
                comprador: row.comprador_email || "",
                nome: row.comprador_nome || "",
                whatsapp: row.comprador_whatsapp || "",
                metodo: row.metodo_pagamento || "",
                criadoEm: row.created_at || null,
                status: row.status_texto || ETAPAS_CUSTODIA[etapa - 1],
                itens: row.itens || "",
                total: row.valor_total != null ? String(row.valor_total) : "",
                etapa: etapa,
                concluido: Boolean(row.concluido),
                contestacao: /contest/i.test(String(row.status_texto || "")) || Boolean(row.contestacao),
                concluidoEm: row.concluido_em || null,
                etapasCustodia: ETAPAS_CUSTODIA.slice(0, etapa)
            };
        }

        function sincronizarPedidoLocal(pedido) {
            if (!pedido || !pedido.ticketId) return pedido;
            const codigo = normalizarCodigoTicket(pedido.ticketId);
            if (!Array.isArray(pedidosAtivos)) pedidosAtivos = [];
            const indice = pedidosAtivos.findIndex(p => normalizarCodigoTicket((p && (p.ticketId || p.pedidoId))) === codigo);
            if (indice >= 0) { pedidosAtivos[indice] = pedido; } else { pedidosAtivos.unshift(pedido); }
            try { localStorage.setItem("marktplace_stand2_pedidos", JSON.stringify(pedidosAtivos)); } catch (e) {}
            return pedido;
        }

        async function buscarTicketSupabase(codigo) {
            if (!window.supabaseClient || !codigo) return null;
            try {
                const { data, error } = await window.supabaseClient.from("tickets").select("*").eq("codigo", codigo).maybeSingle();
                if (error || !data) return null;
                return data;
            } catch (e) {
                return null;
            }
        }

        async function ticketsAtivosSupabase(email) {
            if (!window.supabaseClient || !email) return null;
            try {
                const { data, error } = await window.supabaseClient.from("tickets").select("*").eq("comprador_email", String(email).toLowerCase()).eq("concluido", false);
                if (error || !Array.isArray(data)) return null;
                return data.map(converterRegistroSupabase);
            } catch (e) {
                return null;
            }
        }

        async function atualizarEtapaTicketSupabase(codigo, etapa, statusTexto, concluido) {
            if (!window.supabaseClient || !codigo) return false;
            try {
                const { data, error } = await window.supabaseClient.from("tickets").update({ etapa: etapa, status_texto: statusTexto, concluido: concluido, concluido_em: concluido ? new Date().toISOString() : null }).eq("codigo", codigo).select("codigo");
                if (error || !Array.isArray(data) || data.length === 0) return false;
                return true;
            } catch (e) {
                return false;
            }
        }

        function ticketConcluido(pedido) {
            const status = String((pedido && pedido.status) || "").toLowerCase();
            return /(conclu|entregue|encerrad)/.test(status);
        }

        function ticketPertenceAoUsuario(pedido) {
            if (!pedido || !pedido.comprador || !currentUser || !currentUser.email) return true;
            return String(pedido.comprador).toLowerCase() === String(currentUser.email).toLowerCase();
        }

        function ticketsAtivosDoUsuario() {
            return (Array.isArray(pedidosAtivos) ? pedidosAtivos : []).filter(p => p && p.ticketId && !ticketConcluido(p) && ticketPertenceAoUsuario(p));
        }

        async function respostaOpcaoRastrear() {
            let lista;
            const remotos = (currentUser && currentUser.email && window.supabaseClient)
                ? await ticketsAtivosSupabase(currentUser.email)
                : null;
            if (Array.isArray(remotos)) {
                lista = remotos;
            } else {
                lista = ticketsAtivosDoUsuario();
            }
            if (!lista.length) {
                return "Nenhum ticket ativo encontrado para você nesta sessão. Se você já comprou antes, digite aqui o código do seu ticket (ex: TICK-4819) para consultá-lo, use o menu 'Rastrear Pedido', ou acione o Suporte oficial pelo WhatsApp. Tickets concluídos aparecem apenas consultando o código exato.";
            }
            const linhas = lista.slice(0, 8).map(p => `• ${String(p.ticketId).toUpperCase()} — ${p.status || "em custódia"}`).join("\n");
            return `Você tem ${lista.length} ticket(s) ativo(s):\n${linhas}\n\nPara acompanhar: menu 'Rastrear Pedido' e digite o código TICK-, ou fale com o Suporte oficial pelo WhatsApp. Tickets concluídos saem desta lista e ficam consultáveis pelo código exato.`;
        }

        function respostaBotPorPalavraChave(texto) {
            const t = (texto || "").toLowerCase();
            if (/rastr|ticket|tick-\d|t-i-c-k|pedido/.test(t)) return respostaOpcaoRastrear();
            if (/cust[oó]dia|intermedi|segur|transfer/.test(t)) return OPCOES_MENU_BOT[1].resposta;
            if (/pag|comprov|pix|cobran|estorn|reembols/.test(t)) return OPCOES_MENU_BOT[2].resposta;
            if (/anunci|vender|publicar|invent/.test(t)) return OPCOES_MENU_BOT[3].resposta;
            if (/login|logar|senha|c[oó]digo|gmail|email/.test(t)) return OPCOES_MENU_BOT[4].resposta;
            if (/suporte|atendente|humano|falar/.test(t)) return OPCOES_MENU_BOT[5].resposta;
            if (/ol[aá]|oi|bom dia|boa tarde|boa noite|obrigad|teste/.test(t)) return "Olá! Sou o bot do MARKTPLACE stand2. Escolha uma opção abaixo para receber ajuda:";
            return null;
        }

        function enviarMensagemSuporte() {
            const input = document.getElementById("chat-input-texto");
            if (!input.value.trim()) return;
            const textoUsuario = input.value.trim();
            const chat = document.getElementById("chat-mensagens");
            chat.innerHTML += `<div class="bg-[#1c1812] border border-[#2f2920] rounded-xl p-2.5 text-white ml-auto max-w-[85%] text-right"><p class="font-bold text-[var(--accent)]">Você</p>${escapeHtml(textoUsuario)}</div>`;
            input.value = "";
            chat.scrollTop = chat.scrollHeight;
            const classificacao = (!isAdminUsuario()) ? classificarAssuntoSuporte(textoUsuario) : null;
            const disparouWhatsApp = classificacao ? dispararAlertaWhatsAppAdmin(classificacao.assunto, classificacao.ticket, textoUsuario) : false;
            const respostaPalavra = respostaBotPorPalavraChave(textoUsuario);
            setTimeout(async () => {
                if (disparouWhatsApp) return;
                let textoFinal = null;
                try { textoFinal = await respostaPalavra; } catch (e) { textoFinal = null; }
                if (textoFinal && String(textoFinal).includes("Escolha uma opção")) {
                    chat.innerHTML += construirMenuBot();
                } else if (textoFinal) {
                    chat.innerHTML += `<div class="bg-[#050505] border border-[#26211a] rounded-xl p-2.5 text-gray-300 max-w-[85%] whitespace-pre-line"><p class="font-bold text-[var(--accent)]">Bot Oficial</p>${escapeHtml(textoFinal)}</div>`;
                } else {
                    chat.innerHTML += construirMenuBot();
                }
                chat.scrollTop = chat.scrollHeight;
            }, 1000);
        }

        function openModalComoFunciona() { setModalVisivel("modal-como-funcionamos", true); }
        function closeModalComoFunciona() { setModalVisivel("modal-como-funcionamos", false); }
