
        let currentUser = null;
        let codigoEnviadoSimulado = "";
        let codigoAnuncioSimulado = "";
        let anunciosEmMemoria = [];
        let carrinhoItens = [];
        let pedidosAtivos = [];
        let anuncioSelecionadoAtual = null;
        let fotosNovasBase64 = [];

        // ===== Admin e EmailJS (preencha as credenciais abaixo) =====
        const ADMIN_EMAIL = "scruzsamuka@gmail.com";
        const ADMIN_EMAIL_EXTRA = "globalinventorystore@gmail.com";
        const ADMIN_EMAILS = [ADMIN_EMAIL, ADMIN_EMAIL_EXTRA];
        function ehEmailAdmin(email) {
            const alvo = (email || "").toLowerCase();
            return ADMIN_EMAILS.some(adm => adm === alvo);
        }
        const APP_CONFIG = window.CONFIG || {};
        const ADMIN_SENHA_DIRETA = APP_CONFIG.ADMIN_SENHA_DIRETA || "";
        const CODIGO_ADMIN_FIXO = APP_CONFIG.CODIGO_ADMIN_FIXO || "";
        const CHAVE_STORAGE_BANIDOS = "marktplace_stand2_banidos";
        const EMAILJS_SERVICE_ID = APP_CONFIG.EMAILJS_SERVICE_ID || "service_cbzumvf";
        const EMAILJS_TEMPLATE_ID = APP_CONFIG.EMAILJS_TEMPLATE_ID || "template_2i8efoy";
        const EMAILJS_PUBLIC_KEY = APP_CONFIG.EMAILJS_PUBLIC_KEY || "1vj4x8Vvg6VTECZG7";
        let emailjsInicializado = false;

        // ===== Alerta WhatsApp do admin (chat de suporte) =====
        const ADMIN_WHATSAPP = "";
        const WHATSAPP_ALERTA_COOLDOWN_MS = 60000;
        const CHAVE_STORAGE_WPP_COOLDOWN = "marktplace_stand2_wpp_alertas";

        const STATUS_PEDIDO = {
            aguardando_pagamento: 'Aguardando confirmação do pagamento',
            aguardando_conta_vendedor: 'Pagamento confirmado - aguardando envio dos dados da conta',
            em_conferencia: 'Dados recebidos - suporte conferindo a conta antes da entrega',
            entregue_finalizado: 'Conta entregue e confirmada - repasse liberado'
        };

        function montarResumoRapidoTicket({ ticketId, statusKey, itensResumo, compradorEmail, compradorWhats }) {
            const statusTexto = STATUS_PEDIDO[statusKey] || STATUS_PEDIDO.aguardando_pagamento;
            return `
🎫 <strong>Ticket:</strong> ${escapeHtml(ticketId)}
📌 <strong>Status atual:</strong> ${statusTexto}
🛒 <strong>Itens:</strong> ${itensResumo}
👤 <strong>Comprador:</strong> ${compradorEmail} | ${compradorWhats}

⚡ <strong>Como funciona a entrega rápida:</strong>
1. Pagamento validado fica em custódia com o suporte.
2. Solicitamos os dados da conta ao vendedor e conferimos o anúncio.
3. Liberamos os dados aqui no suporte e, após sua confirmação, o repasse ao vendedor é concluído.
            `.trim();
        }

        function gerarSvgAvatar(newShape, detalhe) {
            return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='#16130e'/><rect x='2.5' y='2.5' width='59' height='59' rx='12' fill='none' stroke='#2b251c' stroke-width='2'/>${newShape}${detalhe}</svg>`)}`;
        }

        const AVATARES = [
            gerarSvgAvatar("<path d='M32 12c-9 0-16 7-16 16v10c0 9 7 16 16 16s16-7 16-16V28c0-9-7-16-16-16z' fill='#1c1812' stroke='#0b0907' stroke-width='1.5'/><path d='M22 30h20v8a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4z' fill='#0b0907'/><rect x='25' y='33' width='14' height='3.5' rx='1.75' fill='#f59e0b'/>", "<text x='32' y='12' font-size='6' text-anchor='middle' fill='#ffffff' font-family='monospace'>GHOST</text>"),
            gerarSvgAvatar("<circle cx='32' cy='30' r='17' fill='#1c1812' stroke='#0b0907' stroke-width='1.5'/><path d='M21 32h22v7a6 6 0 0 1-6 6H27a6 6 0 0 1-6-6z' fill='#0b0907'/><rect x='25' y='35' width='5' height='3' rx='1.5' fill='#f59e0b'/><rect x='34' y='35' width='5' height='3' rx='1.5' fill='#f59e0b'/>", "<rect x='30' y='13' width='4' height='10' rx='2' fill='#ffffff' opacity='0.85'/>"),
            gerarSvgAvatar("<path d='M32 13c-10 0-18 8-18 18v9c0 10 8 18 18 18s18-8 18-18v-9c0-10-8-18-18-18z' fill='#1c1812' stroke='#0b0907' stroke-width='1.5'/><circle cx='32' cy='34' r='9' fill='#0b0907'/><circle cx='32' cy='34' r='4' fill='none' stroke='#f59e0b' stroke-width='2'/><path d='M32 22v-6' stroke='#f59e0b' stroke-width='2'/>", "<text x='32' y='12' font-size='6' text-anchor='middle' fill='#ffffff' font-family='monospace'>SNIPER</text>"),
            gerarSvgAvatar("<path d='M32 12c-10 0-18 8-18 18v8c0 10 8 18 18 18s18-8 18-18v-8c0-10-8-18-18-18z' fill='#1c1812' stroke='#0b0907' stroke-width='1.5'/><path d='M18 34c0-4 6-6 14-6s14 2 14 6v4H18z' fill='#0b0907'/><rect x='23' y='34' width='18' height='2.5' rx='1.25' fill='#f59e0b'/>", "<path d='M14 20c6-6 12-7 18-7s12 1 18 7' stroke='#ffffff' stroke-width='2' fill='none' opacity='0.85'/>"),
            gerarSvgAvatar("<path d='M32 12c-10 0-18 8-18 18v10c0 9 8 17 18 17s18-8 18-17V30c0-10-8-18-18-18z' fill='#1c1812' stroke='#0b0907' stroke-width='1.5'/><path d='M20 33h24v6a5 5 0 0 1-5 5H25a5 5 0 0 1-5-5z' fill='#0b0907'/><rect x='24' y='35' width='7' height='3' rx='1.5' fill='#f59e0b'/><rect x='35' y='35' width='5' height='3' rx='1.5' fill='#ffffff'/>", "<rect x='28' y='10' width='8' height='6' rx='2' fill='#f59e0b' opacity='0.9'/>")
        ];

        function escapeHtml(str) {
            return String(str ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        }

        function sanitizarNomePublico(nome) {
            if (!nome) return "Jogador";
            if (nome.includes("@")) return nome.split("@")[0];
            return nome;
        }

        function ehIdNumerico(id) {
            return (typeof id === "number" && Number.isFinite(id)) || (typeof id === "string" && /^\d+$/.test(id.trim()));
        }

        function normalizarAnuncio(row) {
            const curtidoFlag = Boolean(row.curtidoPormim ?? row.curtidoPorMim ?? false);
            const fotosNormalizadas = Array.isArray(row.fotos) ? row.fotos : [];
            const textoDesc = row.descricao ?? row.desc ?? "• Inventário verificado e garantido.";
            const rawId = row.id ?? ("local_" + Date.now());
            return {
                id: ehIdNumerico(rawId) ? Number(rawId) : String(rawId),
                titulo: row.titulo || "Conta Standoff 2",
                preco: row.preco || "R$ 0,00",
                rank: row.rank || "Master",
                vinculo: row.vinculo || "Google ID",
                descricao: textoDesc,
                desc: textoDesc,
                vendedor: row.vendedor || "Sistema",
                likes: Number(row.likes ?? 0),
                curtidoPormim: curtidoFlag,
                vendido: Boolean(row.vendido ?? false),
                fotos: fotosNormalizadas
            };
        }

        function prepararPayloadSupabase(anuncio, incluirId = false) {
            const textoDescricao = anuncio.descricao ?? anuncio.desc ?? "• Inventário verificado e garantido.";
            const payload = {
                titulo: anuncio.titulo,
                preco: anuncio.preco,
                rank: anuncio.rank,
                vinculo: anuncio.vinculo,
                descricao: textoDescricao,
                vendedor: anuncio.vendedor,
                likes: Number(anuncio.likes ?? 0),
                curtidoPormim: Boolean(anuncio.curtidoPormim),
                fotos: Array.isArray(anuncio.fotos) ? anuncio.fotos : []
            };
            if (incluirId && ehIdNumerico(anuncio.id)) {
                payload.id = Number(anuncio.id);
            }
            return payload;
        }

        function carregarEstadoLocalSeguro() {
            const termosAceitos = localStorage.getItem("marktplace_stand2_termos");
            if (!termosAceitos) {
                const modalBoasVindas = document.getElementById("modal-boas-vindas");
                if (modalBoasVindas) setModalVisivel("modal-boas-vindas", true);
            }
            const storedUser = localStorage.getItem("marktplace_stand2_user");
            if (storedUser) {
                try {
                    currentUser = JSON.parse(storedUser);
                    if (currentUser) {
                        currentUser.username = sanitizarNomePublico(currentUser.username);
                        currentUser.isAdmin = Boolean(currentUser.email && ehEmailAdmin(currentUser.email));
                        aplicarEstadoUsuario();
                    }
                } catch (e) {
                    localStorage.removeItem("marktplace_stand2_user");
                }
            }
            const storedCart = localStorage.getItem("marktplace_stand2_cart");
            if (storedCart) {
                try {
                    carrinhoItens = JSON.parse(storedCart) || [];
                } catch (e) {
                    carrinhoItens = [];
                }
                atualizarBadgeCarrinho();
            }
            const storedPedidos = localStorage.getItem("marktplace_stand2_pedidos");
            if (storedPedidos) {
                try {
                    pedidosAtivos = JSON.parse(storedPedidos) || [];
                } catch (e) {
                    pedidosAtivos = [];
                }
            }
        }
