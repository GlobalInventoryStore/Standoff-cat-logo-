        // ============================================================
        // MARKTPLACE stand2 — Gateway de pagamento
        // Fase 1: PIX manual. Gera BR Code (EMV) real no navegador e
        // encaminha o comprovante ao admin pelo WhatsApp.
        // Nenhum segredo fica neste arquivo: a chave é pública por natureza.
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
            const whats = String((window.CONFIG && window.CONFIG.ADMIN_WHATSAPP) || "5564984156811");
            const texto = "[MARKTPLACE stand2] Comprovante PIX\nTicket: " + ticketId + "\nValor: " + valorTexto + "\n\nSegue o comprovante para verificacao e liberacao dos dados da conta.";
            if (arquivo && navigator.share && navigator.canShare) {
                try {
                    const dados = { files: [arquivo], text: texto };
                    if (navigator.canShare(dados)) {
                        await navigator.share(dados);
                        return "compartilhado";
                    }
                } catch (e) {
                    // Usuário cancelou ou navegador sem suporte: cai no link abaixo.
                }
            }
            window.open("https://wa.me/" + whats + "?text=" + encodeURIComponent(texto), "_blank", "noopener");
            return "link";
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
