        // ============================================================
        // MARKTPLACE stand2 — Gateway de pagamento
        // Fase 1: PIX manual (mantido para compatidade).
        // Fase 2: Mercado Pago via Supabase Edge Functions.
        // ============================================================

        const PIX_CONFIG = (function () {
            const cfg = (typeof window !== "undefined" && window.CONFIG) || {};
            const meta = function (nome) {
                const el = document.querySelector('meta[name="' + nome + '"]');
                return el ? String(el.getAttribute("content") || "").trim() : "";
            };
            return {
                chave: String(cfg.PIX_CHAVE || meta("pix-chave") || "").trim(),
                nome: String(cfg.PIX_NOME || meta("pix-nome") || "MARKTPLACE STAND2").trim(),
                cidade: String(cfg.PIX_CIDADE || meta("pix-cidade") || "SAO PAULO").trim()
            };
        })();

        let pixGatewayCopiaECola = "";

        // Mercado Pago config - chaves vindo de window.CONFIG
        const MP_CONFIG = {
            publicKey: String(window.CONFIG && window.CONFIG.MP_PUBLIC_KEY || ""),
            accessToken: String(window.CONFIG && window.CONFIG.MP_ACCESS_TOKEN || ""),
            webhookSecret: String(window.CONFIG && window.CONFIG.MP_WEBHOOK_SECRET || "")
        };

        function pixEstaConfigurado() { return PIX_CONFIG.chave.length > 0; }

        function formatarValorPix(valor) {
            const numero = Number(valor || 0);
            return "R$ " + (isFinite(numero) ? numero : 0).toFixed(2).replace(".", ",");
        }

        function crc16ccitt(texto) {
            let crc = 0xFFFF;
            for (let i = 0; i < texto.length; i++) {
                crc ^= texto.charCodeAt(i) << 8;
                for (let b = 0; b < 8; b++) {
                    crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
                }
            }
            return crc.toString(16).toUpperCase().padStart(4, "0");
        }

        function emvPix(id, valor) {
            const v = String(valor == null ? "" : valor);
            return id + String(v.length).padStart(2, "0") + v;
        }

        function normalizarTextoPix(texto) {
            return String(texto || "")
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^A-Za-z0-9 ]/g, "")
                .toUpperCase()
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 25);
        }

        function tipoChavePix(chave) {
            const limpa = String(chave || "").replace(/\D/g, "");
            if (String(chave).indexOf("@") >= 0) return "02";
            if (/^\d{11}$/.test(limpa) || /^\d{14}$/.test(limpa)) return "01";
            if (limpa.length >= 10 && limpa.length <= 13) return "03";
            return "08"; // chave aleatória (UUID)
        }

        // BR Code dinâmico (EMVCo). CRC calculado sobre tudo até "6304".
        function gerarPixCopiaECola(valorNumerico, txid) {
            if (!pixEstaConfigurado()) return null;
            const valor = Number(valorNumerico || 0);
            if (!isFinite(valor) || valor <= 0) return null;
            const chave = PIX_CONFIG.chave;
            let payload = "";
            payload += emvPix("00", "01");
            payload += emvPix("01", "11");
            payload += emvPix("26", emvPix("00", "br.gov.bcb.pix") + emvPix(tipoChavePix(chave), chave));
            payload += emvPix("52", "0000");
            payload += emvPix("53", "986");
            payload += emvPix("54", valor.toFixed(2));
            payload += emvPix("58", "BR");
            payload += emvPix("59", normalizarTextoPix(PIX_CONFIG.nome) || "MARKTPLACE STAND2");
            payload += emvPix("60", normalizarTextoPix(PIX_CONFIG.cidade) || "SAO PAULO");
            const idTx = String(txid || "MARKTPLACE").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "MARKTPLACE";
            payload += emvPix("62", emvPix("05", idTx));
            payload += "6304";
            return payload + crc16ccitt(payload + "6304");
        }

        function copiarPixCopiaECola() {
            if (!pixGatewayCopiaECola) {
                mostrarAlerta("PIX", "Gere o QR Code antes de copiar.", "aviso");
                return;
            }
            const copiar = function () {
                const area = document.createElement("textarea");
                area.value = pixGatewayCopiaECola;
                area.style.position = "fixed";
                area.style.opacity = "0";
                document.body.appendChild(area);
                area.select();
                try { document.execCommand("copy"); } catch (e) {}
                document.body.removeChild(area);
                mostrarAlerta("PIX", "Código Copia e Cola copiado.", "sucesso");
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(pixGatewayCopiaECola).then(function () {
                    mostrarAlerta("PIX", "Código Copia e Cola copiado.", "sucesso");
                }).catch(copiar);
            } else {
                copiar();
            }
        }

        // No celular, compartilha a imagem do comprovante junto com o texto.
        // No desktop, abre o WhatsApp com o texto pronto para anexar o print.
        async function compartilharComprovantePix(arquivo, ticketId, valorTexto) {
            const texto = "[MARKTPLACE stand2] Comprovante PIX\nTicket: " + ticketId + "\nValor: " + valorTexto + "\nSegue o comprovante para verificacao e liberacao dos dados da conta.";
            if (arquivo && navigator.share && navigator.canShare) {
                try {
                    const dados = { files: [arquivo], text: texto };
                    if (navigator.canShare(dados)) {
                        await navigator.share(dados);
                        return "compartilhado";
                    }
                } catch (e) {
                    // Usuário cancelou ou navegador sem suporte: cai no aviso abaixo.
                }
            }
            if (typeof enviarAlertaLojaPorWhatsApp === "function") {
                await enviarAlertaLojaPorWhatsApp("COMPROVANTE PIX ENVIADO — MARKTPLACE stand2", texto + "\n(Cliente anexou o comprovante pelo site; suporte deve conferir no ticket.)");
                mostrarAlerta("PIX", "Comprovante registrado. O suporte recebeu o alerta e fará a conferência.", "sucesso");
                return "fila";
            }
            mostrarAlerta("PIX", "Comprovante recebido. O suporte fará a conferência pelo ticket.", "sucesso");
            return "fila";
        }

        // Função para criar pagamento via Mercado Pago Edge Function
        async function criarPagamentoMP(ticketId, valor, itens) {
            if (!MP_CONFIG.accessToken) {
                mostrarAlerta("MP", "Chave de acesso Mercado Pago não configurada.", "erro");
                return null;
            }

            const supabaseUrl = String(window.CONFIG && window.CONFIG.SUPABASE_URL || "").replace("https://", "").replace("http://", "");
            const functionUrl = supabaseUrl ? `https://${supabaseUrl}/functions/criar-pagamento` : "https://globalinventorystore.github.io/Standoff-cat-logo-/supabase/functions/criar-pagamento";

            const itensData = itens || [{ id: "item", title: "MARKTPLACE stand2", quantity: 1, unit_price: Number(valor) }];

            const body = {
                ticketId: ticketId,
                valor: valor,
                itens: itensData
            };

            try {
                const response = await fetch(functionUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });

                const data = await response.json();

                if (data.error) {
                    mostrarAlerta("MP", data.error, "erro");
                    return null;
                }

                return data;
            } catch (error) {
                console.error("Erro ao chamar Edge Function criar-pagamento:", error);
                mostrarAlerta("MP", "Erro ao conectar com Mercado Pago.", "erro");
                return null;
            }
        }

        // Função para processar webhook do Mercado Pago
        async function processarWebhookMP(body, signature) {
            if (!MP_CONFIG.webhookSecret) {
                console.log("Webhook MP não configurado, ignorando assinatura");
                return;
            }

            const crypto = require("crypto");
            const hmac = crypto.createHmac("sha256", MP_CONFIG.webhookSecret).update(body).digest("hex");

            if (hmac !== signature) {
                console.log("Assinatura webhook MP inválida");
                return;
            }

            // Enviar para o frontend processar
            const webhookBody = btoa(body);
            const event = JSON.parse(body);

            if (event.type === "payment.updated" && event.data.status === "approved") {
                // Marcar ticket como pago na etapa 2
                // Isso seria feito via chamada ao supabase
                console.log("Pagamento MP aprovado - ticket", event.data.id, "etapa 2");
            }
        }

        // Comissão do marketplace por faixa de valor (definida pelo dono).
        function calcularComissaoVenda(valor) {
            const v = Number(valor || 0);
            if (!isFinite(v) || v <= 0) return 0;
            if (v <= 100) return 3;
            if (v <= 250) return Math.max(5, v * 0.06);
            return v * 0.07;
        }

        function formatarComissaoVenda(valor) { return formatarValorPix(calcularComissaoVenda(valor)); }
