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
        // Compartilha o comprovante e devolve { imagem } em base64 para anexar no alerta de VENDA.
        async function compartilharComprovantePix(arquivo, ticketId, valorTexto) {
            const texto = "[MARKTPLACE stand2] Comprovante PIX\nTicket: " + ticketId + "\nValor: " + valorTexto + "\nSegue o comprovante para verificacao e liberacao dos dados da conta.";
            let imagemB64 = null;
            if (arquivo && /^image\//.test(arquivo.type || "") && arquivo.size <= 4 * 1024 * 1024) {
                try { imagemB64 = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(arquivo); }); } catch (e) { imagemB64 = null; }
            }
            if (arquivo && navigator.share && navigator.canShare) {
                try {
                    const dados = { files: [arquivo], text: texto };
                    if (navigator.canShare(dados)) {
                        await navigator.share(dados);
                        return { status: "compartilhado", imagem: imagemB64 };
                    }
                } catch (e) {
                    // Usuário cancelou ou navegador sem suporte: cai no aviso abaixo.
                }
            }
            if (typeof enviarAlertaLojaPorWhatsApp === "function") {
                await enviarAlertaLojaPorWhatsApp("COMPROVANTE PIX ENVIADO — MARKTPLACE stand2", texto);
                mostrarAlerta("PIX", "Comprovante registrado. O suporte recebeu o alerta e fará a conferência.", "sucesso");
                return { status: "fila", imagem: imagemB64 };
            }
            mostrarAlerta("PIX", "Comprovante recebido. O suporte fará a conferência pelo ticket.", "sucesso");
            return { status: "fila", imagem: imagemB64 };
        }

        // Verificação automática do comprovante por OCR (sinal extra; a confirmação final é do admin).
        // Verifica: (1) parece comprovante (palavras-chave), (2) data do comprovante (até 3 dias atrás, não futura), (3) valor compatível.
        async function verificarComprovantePorOCR(file, valorTexto) {
            const r = { pareceComprovante: null, dataTexto: null, dataValida: null, valor_OK: null, resumo: "OCR indisponível — conferência manual" };
            if (!file || !(window.Tesseract && typeof window.Tesseract.recognize === "function")) return r;
            try {
                const img = await new Promise((res, rej) => {
                    const i = new Image();
                    i.onload = () => res(i); i.onerror = rej;
                    const fr = new FileReader();
                    fr.onload = (e) => { i.src = e.target.result; };
                    fr.onerror = rej;
                    fr.readAsDataURL(file);
                });
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                canvas.getContext("2d").drawImage(img, 0, 0);
                const resOCR = await window.Tesseract.recognize(canvas, "eng");
                const texto = String((resOCR && resOCR.data && resOCR.data.text) || "");
                const t = texto.toLowerCase();
                const palavras = ["comprovante", "transfer", "pix", "pagamento", "efetuado", "realizado", "identificador", "e2e", "autentic", "institui", "banco"];
                const achadas = palavras.filter((p) => t.includes(p));
                r.pareceComprovante = achadas.length >= 2;
                // Data: pega a mais recente entre as datas válidas
                const datas = texto.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
                let melhor = null;
                for (const d of datas) {
                    const p = d.split("/").map(Number);
                    const dt = new Date(p[2], p[1] - 1, p[0]);
                    if (!isNaN(dt.getTime()) && (!melhor || dt > melhor)) melhor = dt;
                }
                if (melhor) {
                    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                    const diffDias = Math.round((hoje - melhor) / 86400000);
                    r.dataTexto = melhor.toLocaleDateString("pt-BR") + (diffDias === 0 ? " (hoje)" : diffDias > 0 ? ` (${diffDias} dia(s) atrás)` : ` (${Math.abs(diffDias)} dia(s) no futuro)`);
                    r.dataValida = diffDias >= -1 && diffDias <= 3;
                }
                // Valor: compara o valor do pedido com o que aparecer no texto (sem R$, sem pontos)
                if (valorTexto) {
                    const alvo = String(valorTexto).replace(/[^\d,]/g, "").replace(",", ".");
                    if (alvo && Number(alvo) > 0) {
                        const alvoCent = Math.round(Number(alvo) * 100);
                        const nums = texto.replace(/\./g, "").match(/\d[\d.,]{0,20}/g) || [];
                        r.valor_OK = nums.some((n) => Math.round(parseFloat(String(n).replace(",", ".")) * 100) === alvoCent);
                    }
                }
                const partes = [];
                partes.push(r.pareceComprovante === null ? "não foi possível ler o texto" : (r.pareceComprovante ? "parece comprovante (palavras: " + achadas.slice(0, 4).join(", ") + ")" : "NÃO PARECE comprovante (nenhuma palavra típica)"));
                partes.push(r.dataTexto ? "data: " + r.dataTexto + (r.dataValida === false ? " — SUSPEITA/ANTIGA" : "") : "data não encontrada no print");
                if (r.valor_OK !== null) partes.push(r.valor_OK ? "valor confere com o pedido" : "VALOR NÃO CONFERE com o pedido");
                r.resumo = partes.join("; ");
            } catch (e) {
                r.resumo = "Falha no OCR — conferência manual";
            }
            return r;
        }

        // Função para criar pagamento via Mercado Pago Edge Function (token fica só no servidor)
        async function criarPagamentoMP(ticketId, valor, itens, metodo, faixaParcelas) {
            const supabaseUrl = String(window.CONFIG && window.CONFIG.SUPABASE_URL || document.querySelector('meta[name="supabase-url"]')?.content || "").replace("https://", "").replace("http://", "").replace(/\/$/, "");
            if (!supabaseUrl) {
                mostrarAlerta("MP", "Supabase não configurado — não é possível gerar o checkout.", "erro");
                return null;
            }
            const functionUrl = `https://${supabaseUrl}/functions/v1/criar-pagamento`;

            const itensData = (itens && itens.length ? itens : [{ id: "item", title: "MARKTPLACE stand2", quantity: 1, unit_price: Number(valor) }])
                .map(i => ({
                    title: i.title || i.titulo || "MARKTPLACE stand2",
                    quantity: Number(i.quantity || i.quantidade || 1),
                    unit_price: Number(i.unit_price || parseFloat(String(i.preco || "").replace("R$", "").replace(/\./g, "").replace(",", ".")) || valor)
                }));

            const body = {
                ticketId: ticketId,
                valor: valor,
                items: itensData,
                metodo: metodo || "pix",
                parcelas: faixaParcelas || ""
            };

            const anonKey = String(window.CONFIG && window.CONFIG.SUPABASE_PUBLISHABLE_KEY || document.querySelector('meta[name="supabase-key"]')?.content || "");
            const headersMP = { "Content-Type": "application/json" };
            if (anonKey) {
                headersMP["apikey"] = anonKey;
                headersMP["Authorization"] = "Bearer " + anonKey;
            }

            try {
                const response = await fetch(functionUrl, {
                    method: "POST",
                    headers: headersMP,
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

        // Comissão do marketplace por faixa de valor (definida pelo dono): R$3 / 4% / 8% — paga pelo comprador no checkout.
        function calcularComissaoVenda(valor) {
            const v = Number(valor || 0);
            if (!isFinite(v) || v <= 0) return 0;
            if (v <= 100) return 3.0;
            if (v <= 250) return v * 0.04;
            return v * 0.08;
        }

        function formatarComissaoVenda(valor) { return formatarValorPix(calcularComissaoVenda(valor)); }
