        let rastreioAutoRefreshId = null;
        let rastreioBuscaEmAndamento = false;

        function pararAutoRefreshRastreio() {
            if (rastreioAutoRefreshId) { clearInterval(rastreioAutoRefreshId); rastreioAutoRefreshId = null; }
        }
        function abrirRastreioPedido() {
            fecharMenuMobile();
            setModalVisivel("modal-rastreio", true);
            pararAutoRefreshRastreio();
            rastreioAutoRefreshId = setInterval(atualizarRastreioAutomaticamente, 4000);
            if (isAdminUsuario()) {
                const campo = document.getElementById("input-codigo-rastreio");
                if (campo) campo.value = "";
                const resBox = document.getElementById("resultado-rastreio");
                if (resBox) { resBox.classList.remove("hidden"); resBox.innerHTML = '<p class="text-xs text-gray-400">Carregando tickets em aberto do Supabase...</p>'; }
                consultarStatusPedido();
            }
        }
        function closeRastreio() {
            setModalVisivel("modal-rastreio", false);
            pararAutoRefreshRastreio();
            pararCronometroSaidaFila();
        }
        function atualizarRastreioAutomaticamente() {
            const modal = document.getElementById("modal-rastreio");
            if (!modal || modal.style.display === "none") return;
            if (rastreioBuscaEmAndamento) return;
            const codigo = normalizarCodigoTicket(document.getElementById("input-codigo-rastreio").value);
            if (!codigo && !isAdminUsuario()) return;
            consultarStatusPedido(true);
        }

        function registrarBuscaRastreio() {
            const cod = (document.getElementById("input-codigo-rastreio") || {}).value || "";
            eventosGtag("rastreio_busca", { ticket_code: String(cod).slice(0, 12) });
            consultarStatusPedido();
        }

        const ETAPAS_CUSTODIA = [
            "1. Pagamento retido pelo site (custódia segura)",
            "2. Verificação do comprovante de pagamento pelo admin",
            "3. Vendedor entrega os dados da conta ao site",
            "4. Comprador confirma acesso e troca de dados",
            "5. Pagamento liberado ao vendedor (custódia concluída)"
        ];

        function etapaAtualDoPedido(pedido) {
            if (!pedido) return 0;
            if (pedido.etapa) return Math.min(5, Math.max(1, Number(pedido.etapa)));
            if (ticketConcluido(pedido)) return 5;
            return Math.min(5, Math.max(1, (pedido.etapasCustodia || []).length || 1));
        }

        function conteudoPainelIntermediacao(pedido, codigo) {
            const etapaAtual = etapaAtualDoPedido(pedido);
            const etapasHtml = ETAPAS_CUSTODIA.map((etapa, indice) => {
                const numero = indice + 1;
                const concluida = pedido && numero <= etapaAtual;
                const ehAtual = pedido && numero === etapaAtual;
                const classe = concluida ? "text-emerald-400" : "text-gray-500";
                const marcador = ehAtual ? ' <span class="text-[var(--accent)] font-bold">← etapa atual</span>' : (concluida ? " ✓" : "");
                return `<p class="${classe}">${escapeHtml(etapa)}${marcador}</p>`;
            }).join("");
            const info = pedido
                ? `<p class="text-white font-bold">Status: <span class="text-emerald-400">● ${escapeHtml(pedido.status)}</span></p><p class="text-gray-400">Etapa atual: <span class="text-[var(--accent)] font-bold">[${etapaAtual}/5]</span></p><p class="text-gray-400">Itens: ${escapeHtml(pedido.itens)}</p><p class="text-gray-400">Total: <span class="text-white">${escapeHtml(pedido.total)}</span></p><p class="text-[10px] text-gray-500 mt-1">Ticket: <strong>${escapeHtml(pedido.ticketId)}</strong></p>`
                : `<p class="text-white font-bold">Status: <span class="text-amber-400">● Não encontrado nesta sessão</span></p><p class="text-gray-400">Código consultado: ${escapeHtml(codigo)}</p><p class="text-[10px] text-amber-400 mt-1">Amostras antigas de tickets (TICK-4819 etc.) de demonstração não são reais.</p>`;
            const botaoSuporte = `<button type="button" onclick="closeRastreio(); abrirChatSuporte()" class="mt-2 w-full bg-[#1c1812] hover:bg-[#26211a] text-white py-2 rounded-xl text-xs font-bold cursor-pointer border border-[#2f2920]">💬 Falar com o suporte sobre ${escapeHtml(codigo || "o pedido")}</button>`;
            let blocoComprador = "";
            if (pedido && pedido.contestacao) {
                blocoComprador = `<div class="mt-2 bg-red-500/10 border border-red-500/30 rounded-xl p-2.5"><p class="text-[11px] text-red-300 font-bold">⚠ Pedido em contestação</p><p class="text-[11px] text-gray-300">O prazo de conclusão está pausado. Use o botão de suporte abaixo para resolver seu caso.</p></div>`;
            } else if (pedido && !ticketConcluido(pedido) && etapaAtual === 4 && ticketPertenceAoUsuario(pedido)) {
                const restaMs = pedido.entregaEm ? (new Date(pedido.entregaEm).getTime() + PRAZO_AUTO_CONCLUSAO_MS - Date.now()) : null;
                const restaTxt = (restaMs && restaMs > 0) ? `⏳ Tempo restante: <span class="text-amber-300 font-bold">${formatarRestanteAuto(restaMs)}</span>` : `<span class="text-red-300 font-bold">⏰ Prazo de 24h expirando — a venda fecha em instantes se ninguém abrir problema.</span>`;
                blocoComprador = `<div class="mt-3 rounded-2xl border-2 border-amber-500/60 bg-amber-500/10 p-3.5"><p class="text-[13px] font-extrabold uppercase tracking-wide text-amber-400 text-center">⏰ Aviso importante — você tem 24 horas</p><div class="mt-2 space-y-1.5 text-[12px] text-gray-200 leading-relaxed"><p>• Você já recebeu os dados da conta. Agora você tem <strong class="text-amber-300">24 horas</strong> para confirmar o recebimento abaixo ou avisar sobre um problema.</p><p>• Se depois de 24 horas você não confirmar e nem abrir problema, a venda é <strong class="text-amber-300">concluída automaticamente</strong> e o dinheiro é liberado ao vendedor.</p><p>• A conta chegou com verificação em duas etapas (2FA) ou e-mail de recuperação? <strong class="text-red-300">Avise AGORA pelo botão "Tenho um problema"</strong> — dentro do prazo. A conta precisa ser devolvida limpa (sem 2FA e sem tentativa de recuperação), senão o direito ao reembolso é perdido.</p></div><p class="text-center text-[11px] mt-2">${restaTxt}</p></div><div class="mt-2 border-t border-emerald-500/30 pt-2"><p class="text-[10px] uppercase font-bold text-emerald-400 mb-1">Você já recebeu os dados da conta?</p><label class="flex items-start gap-2 text-[11px] text-gray-300 mb-1.5 cursor-pointer"><input type="checkbox" class="chk-confirm-receb mt-0.5"> Entrei na conta e confirmei que os itens estão lá (sem 2FA e sem tentativa de recuperação)</label><label class="flex items-start gap-2 text-[11px] text-gray-300 mb-2 cursor-pointer"><input type="checkbox" class="chk-confirm-receb mt-0.5"> Já troquei e-mail/senha e mantive a conta limpa</label><button type="button" onclick="confirmarRecebimentoComprador('${escapeHtml(pedido.ticketId)}')" class="w-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 py-2 rounded-xl text-xs font-bold cursor-pointer">✓ Confirmar Recebimento</button><button type="button" onclick="abrirContestacaoComprador('${escapeHtml(pedido.ticketId)}')" class="mt-1.5 w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 py-2 rounded-xl text-[11px] cursor-pointer">⚠ Tenho um problema</button><p class="text-[10px] text-gray-500 mt-1.5">Confirmando aqui, a venda fecha na hora.</p></div>`;
            }
            return `${info}<div class="mt-2 border-t border-[#26211a] pt-2"><p class="text-[10px] uppercase font-bold text-[var(--accent)] mb-1">Etapas de custódia</p>${etapasHtml}</div>${blocoComprador}${botaoSuporte}`;
        }

        async function definirEtapaTicketAdmin(ticketId, etapa) {
            if (!isAdminUsuario()) { mostrarAlerta("Admin", "Apenas a conta admin pode alterar a etapa.", "aviso"); return; }
            const codigo = normalizarCodigoTicket(ticketId);
            const pedido = pedidosAtivos.find(p => normalizarCodigoTicket(p.ticketId) === codigo || normalizarCodigoTicket(p.pedidoId) === codigo);
            if (!pedido) { mostrarAlerta("Admin", `Ticket ${codigo} não encontrado.`, "aviso"); return; }
            const ehConclusao = etapa >= 5;
            const statusTexto = ehConclusao ? "Concluído / Entregue (pagamento liberado ao vendedor)" : ETAPAS_CUSTODIA[etapa - 1];
            pedido.etapa = etapa;
            pedido.concluido = ehConclusao;
            pedido.concluidoEm = ehConclusao ? new Date().toISOString() : null;
            pedido.status = statusTexto;
            pedido.etapasCustodia = ETAPAS_CUSTODIA.slice(0, etapa);
            if (etapa >= 4 && !pedido.entregaEm) {
                pedido.entregaEm = new Date().toISOString();
            }
            localStorage.setItem("marktplace_stand2_pedidos", JSON.stringify(pedidosAtivos));
            const okBanco = await atualizarEtapaTicketSupabase(codigo, etapa, statusTexto, ehConclusao);
            if (okBanco) {
                mostrarAlerta("Admin", `Etapa ${etapa}/5 do ticket ${codigo} aplicada no Supabase e localmente.`);
            } else {
                mostrarAlerta("Admin", `Falha ao gravar a etapa ${etapa}/5 do ticket ${codigo} no Supabase. Recarregando os dados reais do banco...`, "aviso");
                const doBanco = await buscarTicketSupabase(codigo);
                if (doBanco) { sincronizarPedidoLocal(converterRegistroSupabase(doBanco)); }
            }
            const codigoAtual = normalizarCodigoTicket(document.getElementById("input-codigo-rastreio").value);
            if (codigoAtual) { await consultarStatusPedido(); }
        }

        function limparTicketsDeTeste() {
            if (!isAdminUsuario()) { mostrarAlerta("Admin", "Apenas a conta admin pode limpar o histórico.", "aviso"); return; }
            if (!confirm(`Limpar TODOS os tickets locais (${pedidosAtivos.length})? Use para zerar tickets de teste no localStorage. Tickets no Supabase não são afetados aqui — para apagar um ticket de verdade, abra o ticket e use "Excluir este ticket (Supabase + local)".`)) return;
            pedidosAtivos = [];
            localStorage.setItem("marktplace_stand2_pedidos", "[]");
            const resBox = document.getElementById("resultado-rastreio");
            if (resBox) { resBox.innerHTML = '<p class="text-emerald-400 text-xs">Histórico local de tickets limpo.</p>'; }
            mostrarAlerta("Admin", "Histórico local de tickets limpo.");
        }

        async function excluirTicketSupabase(codigo) {
            if (!window.supabaseClient || !codigo) return false;
            try {
                const { data, error } = await window.supabaseClient.from("tickets").delete().eq("codigo", codigo).select("codigo");
                if (error || !Array.isArray(data)) return false;
                return true;
            } catch (e) {
                return false;
            }
        }

        async function excluirTicketSelecionado(ticketId) {
            if (!isAdminUsuario()) { mostrarAlerta("Admin", "Apenas a conta admin pode excluir tickets.", "aviso"); return; }
            const codigo = normalizarCodigoTicket(ticketId);
            if (!codigo) return;
            if (!confirm(`Excluir o ticket ${codigo} DE VERDADE do Supabase e do histórico local? Essa ação é permanente.`)) return;
            const okBanco = await excluirTicketSupabase(codigo);
            const codigoNorm = normalizarCodigoTicket(codigo);
            pedidosAtivos = (Array.isArray(pedidosAtivos) ? pedidosAtivos : []).filter(p => normalizarCodigoTicket(p && (p.ticketId || p.pedidoId)) !== codigoNorm);
            try { localStorage.setItem("marktplace_stand2_pedidos", JSON.stringify(pedidosAtivos)); } catch (e) {}
            const campo = document.getElementById("input-codigo-rastreio");
            if (campo) campo.value = "";
            if (okBanco) {
                mostrarAlerta("Admin", `Ticket ${codigo} excluído do Supabase e do histórico local.`);
            } else {
                mostrarAlerta("Admin", `Ticket ${codigo} removido do histórico local, mas o Supabase recusou a exclusão. Verifique a conexão.`, "aviso");
            }
            await consultarStatusPedido();
        }

        const JANELA_SAIDA_FILA_MS = 3600000;
        let abaTicketsAdmin = "abertos";
        let cronometroSaidaFilaId = null;

        function pararCronometroSaidaFila() {
            if (cronometroSaidaFilaId) { clearInterval(cronometroSaidaFilaId); cronometroSaidaFilaId = null; }
        }

        function ticketNaJanelaAberta(p) {
            if (!p) return false;
            if (!p.concluido || !ticketConcluido(p)) return true;
            if (!p.concluidoEm) return false;
            const fim = new Date(p.concluidoEm).getTime() + JANELA_SAIDA_FILA_MS;
            return Date.now() < fim;
        }

        function restanteSaidaFilaFormatado(iso) {
            if (!iso) return null;
            const resta = new Date(iso).getTime() + JANELA_SAIDA_FILA_MS - Date.now();
            if (!(resta > 0)) return null;
            const t = Math.floor(resta / 1000);
            const m = Math.floor(t / 60);
            const s = t % 60;
            return resta >= 60000 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
        }

        function trocarAbaTicketsAdmin(aba) {
            abaTicketsAdmin = aba === "concluidos" ? "concluidos" : "abertos";
            const campo = document.getElementById("input-codigo-rastreio");
            if (campo) campo.value = "";
            consultarStatusPedido();
        }

        async function ticketsEmAbertoSupabase() {
            if (!window.supabaseClient) return null;
            try {
                const limite = new Date(Date.now() - JANELA_SAIDA_FILA_MS).toISOString();
                const { data, error } = await window.supabaseClient
                    .from("tickets")
                    .select("*")
                    .or(`and(concluido.eq.false),and(concluido.eq.true,concluido_em.gte.${limite})`)
                    .order("created_at", { ascending: true });
                if (error || !Array.isArray(data)) return null;
                return data.map(converterRegistroSupabase).filter(ticketNaJanelaAberta);
            } catch (e) {
                return null;
            }
        }

        async function ticketsConcluidosSupabase() {
            if (!window.supabaseClient) return null;
            try {
                const { data, error } = await window.supabaseClient.from("tickets").select("*").eq("concluido", true).order("concluido_em", { ascending: false, nullsFirst: false }).limit(50);
                if (error || !Array.isArray(data)) return null;
                return data.map(converterRegistroSupabase);
            } catch (e) {
                return null;
            }
        }

        function tempoAbertoFormatado(iso) {
            if (!iso) return "desconhecido";
            const abertos = Date.now() - new Date(iso).getTime();
            if (!(abertos >= 0)) return "desconhecido";
            const minutos = Math.floor(abertos / 60000);
            if (minutos < 1) return "menos de 1 min";
            if (minutos < 60) return `há ${minutos} min`;
            const horas = Math.floor(minutos / 60);
            if (horas < 24) return `há ${horas}h${minutos % 60 ? ` ${minutos % 60}m` : ""}`;
            const dias = Math.floor(horas / 24);
            return `há ${dias} dia${dias > 1 ? "s" : ""}${horas % 24 ? ` ${horas % 24}h` : ""}`;
        }

        function estadoPagamentoDoTicket(p) {
            const metodo = escapeHtml(p.metodo || "");
            const valor = escapeHtml(p.total || "");
            if (!metodo && !valor) {
                return '<span class="text-amber-400 font-semibold">Aguardando comprovante (pendente)</span>';
            }
            return `<span class="text-emerald-400 font-semibold">Pagamento em custódia</span> <span class="text-gray-400">(${[metodo, valor].filter(Boolean).join(" — ")})</span>`;
        }

        function cartaoTicketAdmin(p) {
            const concluidoPopular = p.concluido && ticketConcluido(p);
            let faixaRodape = `<span class="text-[10px] text-amber-400 font-semibold">Aguardando ${tempoAbertoFormatado(p.criadoEm)}</span>`;
            if (concluidoPopular) {
                faixaRodape = `<span class="text-[10px] text-emerald-400 font-bold" data-expira="${escapeHtml(p.concluidoEm || "")}">Sai da fila em ${restanteSaidaFilaFormatado(p.concluidoEm) || "0s"}</span>`;
            }
            return `<button type="button" onclick="abrirTicketAdminDaLista('${escapeHtml(p.ticketId)}')" class="w-full text-left bg-[#050505] hover:bg-[#14110c] border ${concluidoPopular ? "border-emerald-500/40" : "border-[#26211a]"} rounded-xl p-2.5 transition cursor-pointer">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                    <span class="font-mono font-bold text-[var(--accent)]">${escapeHtml(p.ticketId)}</span>
                    <span class="text-[11px] font-bold text-white ${concluidoPopular ? "bg-emerald-500/10 text-emerald-300" : "bg-[#1c1812]"} border border-[#2f2920] rounded-lg px-1.5 py-0.5">Etapa [${etapaAtualDoPedido(p)}/5]${concluidoPopular ? " · concluído" : ""}</span>
                </div>
                <p class="text-[11px] mt-1">${estadoPagamentoDoTicket(p)}</p>
                <p class="text-[11px] text-gray-300 mt-0.5">Cliente: <span class="font-semibold text-white">${escapeHtml(p.nome || p.comprador || "—")}</span>${p.comprador ? ` · ${escapeHtml(p.comprador)}` : ""}${p.whatsapp ? ` · ${escapeHtml(p.whatsapp)}` : ""}</p>
                <p class="text-[11px] text-gray-400 mt-0.5 truncate">Itens: ${escapeHtml(p.itens || "—")}</p>
                <div class="flex items-center justify-between mt-1 gap-2 flex-wrap">
                    ${faixaRodape}
                    <span class="text-[10px] text-[var(--accent)] font-bold">Abrir controles →</span>
                </div>
            </button>`;
        }

        function cartaoTicketHistorico(p) {
            const dataFim = p.concluidoEm ? new Date(p.concluidoEm).toLocaleString("pt-BR") : "data não registrada";
            const metodo = escapeHtml(p.metodo || "—");
            const valor = escapeHtml(p.total || "—");
            return `<button type="button" onclick="abrirTicketAdminDaLista('${escapeHtml(p.ticketId)}')" class="w-full text-left bg-[#050505] hover:bg-[#14110c] border border-[#26211a] rounded-xl p-2.5 transition cursor-pointer">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                    <span class="font-mono font-bold text-[var(--accent)]">${escapeHtml(p.ticketId)}</span>
                    <span class="text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-1.5 py-0.5">✓ Concluído</span>
                </div>
                <p class="text-[11px] text-gray-300 mt-1">Cliente: <span class="font-semibold text-white">${escapeHtml(p.nome || p.comprador || "—")}</span>${p.comprador ? ` · ${escapeHtml(p.comprador)}` : ""}${p.whatsapp ? ` · ${escapeHtml(p.whatsapp)}` : ""}</p>
                <p class="text-[11px] text-gray-400 mt-0.5 truncate">Itens: ${escapeHtml(p.itens || "—")}</p>
                <div class="flex items-center justify-between mt-1 gap-2 flex-wrap">
                    <span class="text-[11px]">${estadoPagamentoDoTicket(p)}</span>
                </div>
                <p class="text-[10px] text-gray-500 mt-1">Concluído em: <span class="text-gray-300">${escapeHtml(dataFim)}</span> · Total: <span class="text-white font-semibold">${valor}</span> · Método: ${metodo}</p>
            </button>`;
        }

        function barraAbasTicketsAdmin() {
            const abaBtn = (aba, rotulo) => `<button type="button" onclick="trocarAbaTicketsAdmin('${aba}')" class="flex-1 py-2 rounded-lg text-[11px] font-bold cursor-pointer border ${abaTicketsAdmin === aba ? "bg-[var(--accent)] text-black border-[var(--accent)]" : "bg-[#1c1812] text-gray-300 border-[#2f2920] hover:bg-[#26211a]"}">${rotulo}</button>`;
            return `<div class="flex gap-2 mb-3">${abaBtn("abertos", "Em Aberto")}${abaBtn("concluidos", "Concluídos (Histórico)")}</div>`;
        }

        async function renderListaTicketsAdmin() {
            const resBox = document.getElementById("resultado-rastreio");
            if (!resBox) return;
            pararCronometroSaidaFila();
            resBox.classList.remove("hidden");
            if (abaTicketsAdmin === "concluidos") {
                let historico = await ticketsConcluidosSupabase();
                if (historico === null) {
                    historico = (Array.isArray(pedidosAtivos) ? pedidosAtivos : []).filter(p => p && p.ticketId && ticketConcluido(p));
                }
                if (!historico.length) {
                    resBox.innerHTML = `${barraAbasTicketsAdmin()}<p class="text-emerald-400 text-xs font-semibold">Nenhum ticket concluído no histórico ainda.</p>`;
                    return;
                }
                resBox.innerHTML = `${barraAbasTicketsAdmin()}<p class="text-[10px] uppercase font-bold text-[var(--accent)] mb-1.5">Concluídos / arquivados (${historico.length}) <span class="text-gray-500 normal-case">· salvos no Supabase para auditoria</span></p><div class="space-y-2">${historico.map(cartaoTicketHistorico).join("")}</div>`;
                return;
            }
            let lista = await ticketsEmAbertoSupabase();
            if (lista === null) {
                lista = (Array.isArray(pedidosAtivos) ? pedidosAtivos : [])
                    .filter(p => p && p.ticketId && ticketNaJanelaAberta(p))
                    .map(p => Object.assign({ nome: p.comprador || "", whatsapp: p.whatsapp || "", metodo: p.metodo || "", criadoEm: p.criadoEm || null }, p));
            }
            if (!lista.length) {
                resBox.innerHTML = `${barraAbasTicketsAdmin()}<p class="text-emerald-400 text-xs font-semibold">Nenhum ticket em aberto no momento — todos os pedidos ativos foram concluídos.</p>`;
                return;
            }
            resBox.innerHTML = `${barraAbasTicketsAdmin()}<p class="text-[10px] uppercase font-bold text-[var(--accent)] mb-1.5">Fila (${lista.length}) <span class="text-amber-400 normal-case">· atualiza sozinho a cada 4s</span></p><div class="space-y-2">${lista.map(cartaoTicketAdmin).join("")}</div>`;
            iniciarCronometroSaidaFila();
        }

        function iniciarCronometroSaidaFila() {
            pararCronometroSaidaFila();
            cronometroSaidaFilaId = setInterval(() => {
                const modal = document.getElementById("modal-rastreio");
                if (!modal || modal.style.display === "none" || document.hidden) return;
                let expirou = false;
                document.querySelectorAll("[data-expira]").forEach(span => {
                    const resta = restanteSaidaFilaFormatado(span.getAttribute("data-expira"));
                    if (resta) {
                        span.textContent = `Sai da fila em ${resta}`;
                    } else {
                        expirou = true;
                    }
                });
                if (expirou && !document.getElementById("input-codigo-rastreio").value) {
                    pararCronometroSaidaFila();
                    renderListaTicketsAdmin();
                }
            }, 1000);
        }

        function abrirTicketAdminDaLista(codigo) {
            const campo = document.getElementById("input-codigo-rastreio");
            if (campo) campo.value = normalizarCodigoTicket(codigo);
            consultarStatusPedido();
        }
        function voltarListaTicketsAdmin() {
            const campo = document.getElementById("input-codigo-rastreio");
            if (campo) campo.value = "";
            consultarStatusPedido();
        }

        async function consultarStatusPedido(silencioso) {
            const resBox = document.getElementById("resultado-rastreio");
            if (rastreioBuscaEmAndamento) return;
            rastreioBuscaEmAndamento = true;
            try {
                const codigo = normalizarCodigoTicket(document.getElementById("input-codigo-rastreio").value);
                if (!codigo) {
                    if (isAdminUsuario()) { await renderListaTicketsAdmin(); return; }
                    resBox.classList.remove("hidden"); resBox.innerHTML = '<span class="text-red-400">Insira um código válido.</span>'; return;
                }
                let pedidoEncontrado = null;
                if (window.supabaseClient) {
                    if (!silencioso) { resBox.classList.remove("hidden"); resBox.innerHTML = '<p class="text-xs text-gray-400">Consultando o Supabase...</p>'; }
                    const doBanco = await buscarTicketSupabase(codigo);
                    if (doBanco) {
                        pedidoEncontrado = sincronizarPedidoLocal(converterRegistroSupabase(doBanco));
                    }
                }
                if (!pedidoEncontrado) {
                    pedidoEncontrado = pedidosAtivos.find(p => normalizarCodigoTicket(p.ticketId) === codigo || normalizarCodigoTicket(p.pedidoId) === codigo) || null;
                }
                resBox.classList.remove("hidden");
                let html = conteudoPainelIntermediacao(pedidoEncontrado, codigo);
                if (pedidoEncontrado && isAdminUsuario()) {
                    html += `<p class="text-[11px] text-gray-300 mt-1 pt-1 border-t border-[#26211a]">Cliente: <span class="font-semibold text-white">${escapeHtml(pedidoEncontrado.nome || pedidoEncontrado.comprador || "—")}</span>${pedidoEncontrado.comprador ? ` · ${escapeHtml(pedidoEncontrado.comprador)}` : ""}${pedidoEncontrado.whatsapp ? ` · ${escapeHtml(pedidoEncontrado.whatsapp)}` : ""}</p><p class="text-[11px]">${estadoPagamentoDoTicket(pedidoEncontrado)}</p>`;
                    const etapaAtual = etapaAtualDoPedido(pedidoEncontrado);
                    const rotulos = ["1. Pagamento retido", "2. Verificar comprovante", "3. Dados do vendedor", "4. Dados enviados", "5. Concluir Pedido"];
                    const botoes = rotulos.map((rotulo, indice) => {
                        const numero = indice + 1;
                        const ehEtapa5 = numero === 5;
                        const ativo = numero === etapaAtual && !(pedidoEncontrado.concluido && !ehEtapa5);
                        const estilo = ativo
                            ? (ehEtapa5 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold" : "bg-[var(--accent)] text-black font-bold")
                            : (ehEtapa5 ? "bg-emerald-500/10 text-emerald-400" : "bg-[#1c1812] text-gray-300");
                        return `<button type="button" onclick="definirEtapaTicketAdmin('${escapeHtml(pedidoEncontrado.ticketId)}', ${numero})" class="${estilo} py-2 rounded-xl text-[11px] cursor-pointer">${rotulo}</button>`;
                    }).join("");
                    html += `<div class="mt-2 border-t border-[#26211a] pt-2"><p class="text-[10px] uppercase font-bold text-white mb-1.5">Controles do Admin (Supabase)</p><div class="grid grid-cols-2 gap-1.5">${botoes}</div>`;
                    if (pedidoEncontrado && !ticketConcluido(pedidoEncontrado)) {
                        const acessoSalvo = lerAcessoTicketLocal(pedidoEncontrado.ticketId);
                        const chaveK = ticketChaveCss(pedidoEncontrado.ticketId);
                        html += `<div class="mt-2 rounded-xl border border-emerald-500/25 bg-[#10231a] p-2.5"><p class="text-[10px] uppercase font-bold text-emerald-300 mb-1">🔐 Dados de acesso da conta</p><input id="acesso-gmail-${chaveK}" type="text" placeholder="Gmail da conta" value="${acessoSalvo ? escapeHtml(acessoSalvo.gmail) : ""}" class="mb-2"><input id="acesso-senha-${chaveK}" type="text" placeholder="Senha" value="${acessoSalvo ? escapeHtml(acessoSalvo.senha) : ""}" class="mb-2"><div class="grid grid-cols-2 gap-1.5"><button type="button" onclick="salvarAcessoAdminTicket('${escapeHtml(pedidoEncontrado.ticketId)}')" class="bg-[#1c1812] hover:bg-[#26211a] text-white py-2 rounded-xl text-[11px] font-bold cursor-pointer border border-[#2f2920]">💾 Salvar</button><button type="button" onclick="copiarAcessoAdminTicket('${escapeHtml(pedidoEncontrado.ticketId)}')" class="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 py-2 rounded-xl text-[11px] font-bold cursor-pointer border border-emerald-500/30">📋 Copiar</button></div><p class="text-[10px] text-gray-500 mt-1">Salva criptografado só neste navegador. Chega por e-mail da loja quando o vendedor publica o anúncio.</p></div>`;
                    }
                    html += `<button type="button" onclick="voltarListaTicketsAdmin()" class="mt-2 w-full bg-[#1c1812] hover:bg-[#26211a] text-[var(--accent)] py-2 rounded-xl text-xs font-bold cursor-pointer border border-[#2f2920]">← Voltar para lista em aberto</button></div>`;
                }
                if (isAdminUsuario()) {
                    html += pedidoEncontrado && pedidoEncontrado.ticketId
                        ? `<button type="button" onclick="excluirTicketSelecionado('${escapeHtml(pedidoEncontrado.ticketId)}')" class="mt-2 w-full bg-red-500/10 text-red-400 py-2 rounded-xl text-xs font-bold cursor-pointer border border-red-500/30">🗑 Excluir este ticket (Supabase + local)</button><button type="button" onclick="limparTicketsDeTeste()" class="mt-1.5 w-full bg-red-500/5 text-red-400/80 py-1.5 rounded-xl text-[10px] cursor-pointer border border-red-500/20">🧹 Limpar histórico local</button>`
                        : `<button type="button" onclick="limparTicketsDeTeste()" class="mt-2 w-full bg-red-500/10 text-red-400 py-2 rounded-xl text-xs font-bold cursor-pointer border border-red-500/30">🧹 Limpar Tickets de Teste / Histórico Local</button>`;
                }
                resBox.innerHTML = html;
            } finally {
                rastreioBuscaEmAndamento = false;
            }
        }
