        // A comissão da plataforma é descontada no repasse ao vendedor, nunca no checkout.
        // O comprador só vê a taxa do gateway da forma de pagamento escolhida agora.
        function calcularTaxaMercadoPago(metodo, valorBase, faixa) {
            const base = Number(valorBase || 0);
            if (metodo === "pix" || metodo === "debito") return 0;
            if (metodo === "credito") {
                const f = faixa === "7-12" ? 0.12 : (faixa === "2-6" ? 0.08 : 0.045);
                return base * f;
            }
            return 0;
        }

        async function gerarQrCodePagamento() {
            // Sem tela intermediária: valida, cria a reserva e vai direto ao Checkout Pro do Mercado Pago.
            const btnProsseguir = document.getElementById("checkout-prosseguir");
            const textoBtnOriginal = btnProsseguir ? btnProsseguir.textContent : "";
            const carregarBtn = (texto) => { if (btnProsseguir) { btnProsseguir.disabled = true; btnProsseguir.textContent = texto; btnProsseguir.classList.add("opacity-60"); } };
            const restaurarBtn = () => { if (btnProsseguir) { btnProsseguir.disabled = false; btnProsseguir.textContent = textoBtnOriginal; btnProsseguir.classList.remove("opacity-60"); } };
            const tentativa = Number(window.checkoutAttemptVersion || 0) + 1;
            window.checkoutAttemptVersion = tentativa;
            window.checkoutPreferenceId = null;
            let redirecionado = false;
            try {
            recarregarCarrinhoDoStorage();
            let nomesContas = carrinhoItens.map(i => i.titulo).join(", ");
            if (!nomesContas && anuncioSelecionadoAtual) nomesContas = anuncioSelecionadoAtual.titulo;
            let somaTotal = 0;
            carrinhoItens.forEach(item => {
                let p = parseFloat(String(item.preco || "0").replace("R$", "").replace(".", "").replace(",", ".").trim()) || 0;
                somaTotal += p;
            });
            if (somaTotal === 0 && anuncioSelecionadoAtual) {
                somaTotal = parseFloat(String(anuncioSelecionadoAtual.preco || "0").replace("R$", "").replace(".", "").replace(",", ".").trim()) || 0;
            }
            if (somaTotal <= 0) { mostrarAlerta("Aviso", "Não foi possível calcular o valor do pedido.", "aviso"); restaurarBtn(); return; }
            const metodoEscolhido = (document.querySelector('input[name="pagamento"]:checked') || {}).value || "pix";
            const faixaParcelas = metodoEscolhido === "credito" ? ((document.getElementById("select-parcelas") || {}).value || "1") : "";
            const taxaMP = calcularTaxaMercadoPago(metodoEscolhido, somaTotal, faixaParcelas);
            const totalFinal = Math.round((somaTotal + taxaMP) * 100) / 100;
            const metodoPagamento = metodoEscolhido === "credito"
                ? ("Cartão de Crédito (" + (faixaParcelas === "7-12" ? "7–12×" : faixaParcelas === "2-6" ? "2–6×" : "1×") + ")")
                : metodoEscolhido === "debito" ? "Cartão de Débito" : "PIX";
            const pedidoId = "SO2-" + Math.floor(1000 + Math.random() * 9000);
            // RES é apenas uma referência interna. O código TICK só nasce no webhook aprovado.
            const reservaIdMP = "RES-" + Math.floor(10000 + Math.random() * 90000);
            const ticketFinalId = reservaIdMP.replace(/^RES-/, "TICK-");
            const anuncioIds = carrinhoItens.map(i => i.id).filter(Boolean);
            if (!anuncioIds.length && anuncioSelecionadoAtual && anuncioSelecionadoAtual.id) anuncioIds.push(anuncioSelecionadoAtual.id);
            if (!anuncioIds.length) { mostrarAlerta("Aviso", "Não foi possível identificar os anúncios deste pedido.", "aviso"); return; }
            carregarBtn("🔒 Gerando checkout seguro...");
            const resultado = await criarPagamentoMP({
                reservaId: reservaIdMP,
                anuncioIds,
                metodo: metodoEscolhido,
                parcelas: faixaParcelas,
                comprador: currentUser ? { email: currentUser.email, nome: sanitizarNomePublico(currentUser.username), whatsapp: currentUser.whatsapp || "" } : {},
                pedidoId
            });
            if (tentativa !== Number(window.checkoutAttemptVersion || 0)) return;
            if (!resultado || !resultado.init_point) {
                mostrarAlerta("MP", "Não foi possível abrir o checkout do Mercado Pago agora. Nada foi cobrado — tente de novo em instantes ou fale com o suporte.", "erro");
                return;
            }
            window.checkoutPreferenceId = resultado.id || null;
            acompanharPagamentoMP(reservaIdMP, ticketFinalId, pedidoId, Number(resultado.total || totalFinal), metodoPagamento);
            redirecionado = true;
            window.location.assign(resultado.init_point);
            } catch (e) {
                mostrarAlerta("Erro", "Falha ao iniciar o pagamento. Nada foi cobrado.", "erro");
            } finally {
                if (!redirecionado) restaurarBtn();
            }
        }

        function closePagamentoDetalhes() { setModalVisivel("modal-pagamento-detalhes", false); }

        // A Edge Function grava somente uma RES interna antes do Checkout Pro. Nenhum TICK,
        // modal aprovado, notificação ou anúncio vendido existe antes do webhook aprovado.
        function acompanharPagamentoMP(reservaId, ticketFinalId, pedidoIdGerado, totalCompraNum, metodoPagamento) {
            const totalCompraTexto = formatarValorPix(totalCompraNum);
            (async () => {
                for (let i = 0; i < 180; i++) {
                    await new Promise(r => setTimeout(r, 10000));
                    try {
                        let row = await buscarTicketSupabase(ticketFinalId);
                        if (!row) row = await buscarTicketSupabase(reservaId);
                        if (!row) continue;
                        if (/cancelado/i.test(String(row.status_texto || ""))) return;
                        if (/aprovado/i.test(String(row.status_texto || "")) || Number(row.etapa) >= 2) {
                            const codigoFinal = String(row.codigo || ticketFinalId).toUpperCase();
                            const pedidoAprovado = converterRegistroSupabase(row);
                            pedidosAtivos.unshift({ ...pedidoAprovado, ticketId: codigoFinal, pedidoId: pedidoIdGerado, metodo: metodoPagamento, total: totalCompraTexto, preReserva: false });
                            try { localStorage.setItem("marktplace_stand2_pedidos", JSON.stringify(pedidosAtivos)); } catch (e) {}
                            recarregarCarrinhoDoStorage();
                            carrinhoItens = [];
                            localStorage.removeItem("marktplace_stand2_cart");
                            atualizarBadgeCarrinho();
                            eventosGtag("purchase", { currency: "BRL", value: totalCompraNum, transaction_id: pedidoIdGerado });
                            const destaqueCodigo = document.getElementById("ticket-codigo-destaque-valor");
                            if (destaqueCodigo) destaqueCodigo.textContent = codigoFinal;
                            document.getElementById("ticket-id").textContent = `Ticket #${codigoFinal}`;
                            document.getElementById("ticket-info-gmail").textContent = row.comprador_email || "";
                            document.getElementById("ticket-info-wpp").textContent = row.comprador_whatsapp || "";
                            setModalVisivel("modal-ticket", true);
                            mostrarAlerta("Pagamento aprovado", "O Mercado Pago confirmou o pagamento. Acompanhe pelo menu Rastrear Pedido.", "sucesso");
                            return;
                        }
                    } catch (e) {}
                }
            })();
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

        async function gravarFilaNotificacaoSuporte(titulo, mensagem) {
            if (!window.supabaseClient) return false;
            try {
                const { error } = await window.supabaseClient.from("notificacao").insert([{ titulo: String(titulo || "").slice(0, 200), mensagem: String(mensagem || "").slice(0, 3000) }]);
                return !error;
            } catch (e) { return false; }
        }

        function dispararAlertaWhatsAppAdmin(assunto, ticket, mensagem) {
            if (!registrarDisparoWhatsApp(assunto)) return false;
            gravarFilaNotificacaoSuporte("SUPORTE ACIONADO — MARKTPLACE stand2", montarMensagemAlertaWhatsApp(assunto, ticket, mensagem));
            const chat = document.getElementById("chat-mensagens");
            if (chat) {
                chat.innerHTML += `<div class="bg-[#050505] border border-[#2f2920] rounded-xl p-2.5 text-gray-300 max-w-[90%]"><p class="font-bold text-[var(--accent)]">Bot Oficial</p>Seu acionamento foi registrado. O admin foi avisado e o suporte responde por aqui ou no próprio ticket.<a href="#" onclick="abrirRastreio(); return false;" class="block text-center mt-2 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-black no-underline">Abrir Rastreamento</a></div>`;
                chat.scrollTop = chat.scrollHeight;
            }
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
                preReserva: /^reserva aguardando pagamento/i.test(String(row.status_texto || "")),
                concluido: Boolean(row.concluido),
                contestacao: /contest/i.test(String(row.status_texto || "")) || Boolean(row.contestacao),
                concluidoEm: row.concluido_em || null,
                etapasCustodia: ETAPAS_CUSTODIA.slice(0, etapa),
                anuncioIds: String(row.anuncio_ids || "")
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
                return data.map(converterRegistroSupabase).filter(p => !p.preReserva);
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
                lista = remotos.filter(p => !p.preReserva);
            } else {
                lista = ticketsAtivosDoUsuario().filter(p => !p.preReserva);
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
