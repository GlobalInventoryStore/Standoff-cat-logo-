        function comprimirImagem(file) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement("canvas");
                        let w = img.width, h = img.height;
                        if (w > 800) { h *= 800 / w; w = 800; }
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext("2d");
                        ctx.filter = "none";
                        ctx.drawImage(img, 0, 0, w, h);
                        resolve(canvas.toDataURL("image/jpeg", 0.7));
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            });
        }

        const catalogoStandoff2 = {
            rifles: ["M4A4", "M4A1-S", "AK-47", "AK-74U", "AWP", "SG 553", "G3SG1", "SCAR-20", "MAG-7", "NOVA", "XM1014"],
            skins: {
                "M9 Bayonet": ["Treasure Hunter", "Lore", "Fade", "Doppler", "Chrome"],
                "Gloves": ["Carbon", "Sport", "Driver", "Motorsports", "Crystalline"],
                "AK-47": ["Fire Serpent", "Redline", "Case Hardened", "Midnight", "Black Laminate"],
                "AWP": ["Dragon Lore", "Hyper Beast", "Gungnir", "Medusa", "asi127"],
                "M4A4": ["Howl", "Fire Serpent", "Hyper Beast", "Emperor", "Neon Kimera"],
                "USP-S": ["Abyss", "Night", "Master", "Royal", "Yellow Jacket"],
                "P250": ["Bone Snake", "El Dorado", "Guardian", "Oasis", "Vivid"],
                "Glock-18": ["Fade", "Water Elemental", "Radiation", "Crimson Web", "Heirloom"]
            },
            patterns: ["412", "12", "318", "661", "823", "947", "000", "100", "200", "300"],
            itens_especiais: ["Tie Dye", "Jade Stone"]
        };

        const ARMAS_STANDOFF2_NOMES = [
            "M9 Bayonet", "Butterfly", "Karambit", "Kunai", "Tanto", "Daggers", "Stiletto", "Flip Knife", "Fang", "Jaws", "Scythe",
            "AKR12", "AKR", "AK-47", "AK-74U", "M16", "M4A4", "M4A1", "M4", "AWM", "AWP", "M40", "M110", "Mallard", "M60",
            "FAMAS", "VAL", "Akimbo Uzi", "F/S", "Berettas", "Gloves",
            "USP-S", "USP", "G22", "Glock-18", "Desert Eagle", "Deagle", "P350", "P250", "Five-SeveN",
            "TEC-9", "MAC-10", "MP7", "UMP45", "P90", "SM1014", "FABM", "SPAS"
        ];

        function canonizarParaOCR(valor) {
            return (valor || "").toLowerCase().replace(/[^a-z0-9]/g, "").replace(/0/g, "o").replace(/[1i]/g, "l").replace(/5/g, "s");
        }

        const ARMAS_STANDOFF2_CANON = ARMAS_STANDOFF2_NOMES.map(nome => ({ nome: nome, canon: canonizarParaOCR(nome) }));

        function diferencaNoMaximoUm(a, b) {
            if (a === b) return true;
            const menor = a.length <= b.length ? a : b;
            const maior = a.length <= b.length ? b : a;
            if (maior.length - menor.length > 1) return false;
            let i = 0, j = 0, difs = 0;
            while (i < menor.length && j < maior.length) {
                if (menor[i] === maior[j]) { i++; j++; continue; }
                difs++;
                if (difs > 1) return false;
                if (menor[i] === maior[j + 1] && menor[i + 1] === maior[j]) { i += 2; j += 2; continue; }
                if (menor.length === maior.length) { i++; j++; } else { j++; }
            }
            return true;
        }

        function extrairApenasNomesArmas(textoBruto) {
            if (!textoBruto) return [];
            const tokens = textoBruto.toLowerCase().split(/[^a-z0-9]+/).map(canonizarParaOCR).filter(Boolean);
            const encontradas = [];
            for (let i = 0; i < tokens.length; i++) {
                let janela = "";
                for (let k = i; k < Math.min(tokens.length, i + 3); k++) {
                    janela += tokens[k];
                    for (const arma of ARMAS_STANDOFF2_CANON) {
                        if (arma.canon.length < 2) continue;
                        const confere = janela === arma.canon || (arma.canon.length >= 5 && diferencaNoMaximoUm(janela, arma.canon));
                        if (confere && !encontradas.includes(arma.nome)) encontradas.push(arma.nome);
                    }
                }
            }
            return encontradas;
        }

        const CATEGORIAS_ITENS_STANDOFF2 = [
            ["Facas", ["M9 Bayonet", "Butterfly", "Karambit", "Kunai", "Tanto", "Daggers", "Stiletto", "Flip Knife", "Fang", "Jaws", "Scythe"]],
            ["Rifles", ["AKR12", "AKR", "AK-47", "AK-74U", "M16", "M4A4", "M4A1", "M4", "AWM", "AWP", "M40", "M110", "Mallard", "M60", "FAMAS", "VAL"]],
            ["Pistolas", ["F/S", "Berettas", "USP-S", "USP", "G22", "Glock-18", "Desert Eagle", "Deagle", "P350", "P250", "Five-SeveN"]],
            ["SMGs", ["Akimbo Uzi", "TEC-9", "MAC-10", "MP7", "UMP45", "P90", "SM1014"]],
            ["Shotguns", ["FABM", "SPAS"]],
            ["Luvas e itens", ["Gloves"]]
        ];

        function montarDescricaoOrganizada(contagem) {
            const nomes = Object.keys(contagem || {});
            if (!nomes.length) return "";
            const usados = new Set();
            const linhas = [];
            for (const [categoria, itensCategoria] of CATEGORIAS_ITENS_STANDOFF2) {
                const parte = itensCategoria
                    .filter(nome => contagem[nome])
                    .map(nome => { usados.add(nome); return `${nome} x${contagem[nome]}`; });
                if (parte.length) linhas.push(`${categoria}: ${parte.join(", ")}`);
            }
            const fora = nomes.filter(nome => contagem[nome] && !usados.has(nome))
                .map(nome => `${nome} x${contagem[nome]}`);
            if (fora.length) linhas.push(`Outros: ${fora.join(", ")}`);
            return linhas.join("\n");
        }

        function carregarImagemDeArquivo(file) {
            return new Promise((resolve, reject) => {
                const url = URL.createObjectURL(file);
                const img = new Image();
                img.onload = function() { URL.revokeObjectURL(url); resolve(img); };
                img.onerror = function(e) { URL.revokeObjectURL(url); reject(e); };
                img.src = url;
            });
        }

        function desenharVarianteOCR(img, escala, contraste) {
            const maxLado = 2200;
            let w = img.width * escala, h = img.height * escala;
            const fator = Math.min(1, maxLado / Math.max(w, h));
            w = Math.round(w * fator);
            h = Math.round(h * fator);
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, w, h);
            if (contraste > 0) {
                const dados = ctx.getImageData(0, 0, w, h);
                const px = dados.data;
                const fatorC = (259 * (contraste + 255)) / (255 * (259 - contraste));
                for (let i = 0; i < px.length; i += 4) {
                    const cinza = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
                    const c = Math.max(0, Math.min(255, fatorC * (cinza - 128) + 128));
                    px[i] = c; px[i + 1] = c; px[i + 2] = c;
                }
                ctx.putImageData(dados, 0, 0);
            }
            return canvas;
        }

        async function reconhecerArmasEmFoto(file) {
            if (!(window.Tesseract && typeof window.Tesseract.recognize === "function")) return [];
            const armas = [];
            try {
                const img = await carregarImagemDeArquivo(file);
                const tentativas = [
                    { escala: 1, contraste: 0 },
                    { escala: 1.5, contraste: 60 },
                    { escala: 2, contraste: 60 }
                ];
                for (const t of tentativas) {
                    try {
                        const canvas = desenharVarianteOCR(img, t.escala, t.contraste);
                        const resultado = await window.Tesseract.recognize(canvas, "eng");
                        const novas = extrairApenasNomesArmas(resultado && resultado.data ? resultado.data.text : "");
                        for (const a of novas) {
                            if (!armas.includes(a)) armas.push(a);
                        }
                        if (armas.length >= 6) break;
                    } catch (e) {}
                }
            } catch (e) {}
            return armas;
        }

        async function processarFotosInventario(input) {
            if (!input.files || input.files.length === 0) return;
            fotosNovasBase64 = [];
            const totalFotos = Math.min(input.files.length, 7);
            for (let i = 0; i < totalFotos; i++) {
                const comp = await comprimirImagem(input.files[i]);
                if (comp) fotosNovasBase64.push(comp);
            }
            const campoDesc = document.getElementById("conta-desc");
            const contagemArmas = {};
            if (campoDesc) campoDesc.value = "Lendo nomes das armas nas imagens...";
            try {
                const tarefasOCR = [];
                for (let i = 0; i < Math.min(input.files.length, 7); i++) {
                    tarefasOCR.push(
                        reconhecerArmasEmFoto(input.files[i])
                            .then(armas => {
                                const unicas = Array.from(new Set(armas));
                                for (const a of unicas) contagemArmas[a] = (contagemArmas[a] || 0) + 1;
                            })
                            .catch(() => {})
                    );
                }
                await Promise.all(tarefasOCR);
            } finally {
                if (campoDesc) {
                    campoDesc.value = montarDescricaoOrganizada(contagemArmas);
                }
            }
        }

        function limparAvisoConfianca() {
            const existentes = document.querySelectorAll(".confianca-avisos");
            existentes.forEach(el => el.remove());
        }

        async function publicarAnuncioFinal() {
            const btnPublicar = document.getElementById("btn-publicar-anuncio");
            const titulo = document.getElementById("conta-titulo").value.trim();
            const precoInput = document.getElementById("conta-preco").value.trim();
            const rank = document.getElementById("conta-rank").value;
            const vinculo = document.getElementById("conta-vinculo").value;
            let descFinal = document.getElementById("conta-desc").value.trim();

            if (currentUser && usuarioEstaBanido(sanitizarNomePublico(currentUser.username), currentUser.email)) {
                mostrarAlerta("Acesso Bloqueado", "Sua conta está banida e não pode publicar anúncios.", "aviso");
                return;
            }
            if (!titulo || !precoInput) { mostrarAlerta("Aviso", "Preencha título e preço.", "aviso"); return; }
            if (fotosNovasBase64.length === 0) { mostrarAlerta("Aviso", "Adicione pelo menos um print do inventário.", "aviso"); return; }

            const maxTotalBytes = 2 * 1024 * 1024;
            let totalBytes = 0;
            for (const photo of fotosNovasBase64) {
                const base64Part = photo.split("base64,")[1] || "";
                totalBytes += base64Part.length * 3 / 4;
            }
            if (totalBytes > maxTotalBytes) {
                mostrarAlerta("Aviso", "Total de fotos muito grande. Reduza o número de imagens ou use fotos menores.", "aviso");
                return;
            }

            if (!descFinal) {
                descFinal = "• Inventário verificado e garantido.";
            }

            const precoFormatado = formatarPrecoMoeda(precoInput);

            let anuncioParaSalvar = normalizarAnuncio({
                id: "local_" + Date.now(),
                titulo,
                preco: precoFormatado,
                rank,
                vinculo,
                descricao: descFinal,
                vendedor: sanitizarNomePublico(currentUser ? currentUser.username : "Jogador"),
                likes: 0,
                curtidoPormim: false,
                fotos: [...fotosNovasBase64]
            });

            if (btnPublicar) {
                btnPublicar.disabled = true;
                btnPublicar.textContent = "Publicando...";
            }

            let salvoNoBanco = false;

            if (window.supabaseClient) {
                try {
                    const { data: inseridos, error } = await window.supabaseClient.from("contas").insert([prepararPayloadSupabase(anuncioParaSalvar, false)]).select("*");
                    if (error) {
                        console.error("Erro ao salvar no Supabase:", error);
                        mostrarAlerta("Erro ao Salvar no Banco", `O Supabase recusou o anúncio (${error.code || "erro"}): ${error.message}`, "aviso");
                    } else {
                        salvoNoBanco = true;
                        if (Array.isArray(inseridos) && inseridos.length > 0) {
                            anuncioParaSalvar = normalizarAnuncio(inseridos[0]);
                        }
                    }
                } catch (e) {
                    console.error("Exceção ao salvar no Supabase:", e);
                    mostrarAlerta("Erro de Conexão", "Não foi possível comunicar com o Supabase.", "aviso");
                }
            } else {
                mostrarAlerta("Modo Local", "Cliente Supabase indisponível; anúncio salvo apenas neste navegador.", "aviso");
            }

            if (btnPublicar) {
                btnPublicar.disabled = false;
                btnPublicar.textContent = "Publicar Conta";
            }

            if (!salvoNoBanco && window.supabaseClient) {
                return;
            }

            anunciosEmMemoria.unshift(anuncioParaSalvar);
            localStorage.setItem("marktplace_stand2_anuncios", JSON.stringify(anunciosEmMemoria));
            fotosNovasBase64 = [];

            const acessoGmailEl = document.getElementById("conta-acesso-gmail");
            const acessoSenhaEl = document.getElementById("conta-acesso-senha");
            const acessoGmail = acessoGmailEl ? acessoGmailEl.value.trim() : "";
            const acessoSenha = acessoSenhaEl ? acessoSenhaEl.value.trim() : "";
            if (acessoGmail || acessoSenha) {
                salvarAcessoVendedorLocal(anuncioParaSalvar.id, acessoGmail, acessoSenha);
                if (acessoGmailEl) acessoGmailEl.value = "";
                if (acessoSenhaEl) acessoSenhaEl.value = "";
            }
            const temAcessoNaPublicacao = !!(acessoGmail || acessoSenha);
            enviarAlertaLojaPorWhatsApp(
                "ANUNCIADA — MARKTPLACE stand2",
                "ANUNCIADA\nVendedor: " + sanitizarNomePublico(currentUser ? currentUser.username : "Jogador") + "\nAnúncio: " + titulo + "\nPreço: " + precoFormatado +
                    (temAcessoNaPublicacao ? ("\n\nGmail da conta: " + (acessoGmail || "(vendedor não informou)") + "\nSenha: " + (acessoSenha || "(vendedor não informou)")) : "") +
                    (temAcessoNaPublicacao ? "\n\n✅ Entrega pronta: dados recebidos na publicação." : "\n\n⚠ Vendedor não informou Gmail/senha na publicação — entrega dependerá dele.") +
                    "\n\nHora: " + new Date().toLocaleString("pt-BR")
            );

            document.getElementById("conta-titulo").value = "";
            document.getElementById("conta-preco").value = "";
            document.getElementById("conta-desc").value = "";
            document.getElementById("conta-fotos").value = "";

            carregarCatalogo();
            closeAnuncioModal();
            mostrarAlerta(temAcessoNaPublicacao ? "Sucesso" : "Publicado — entrega mais lenta", temAcessoNaPublicacao
                ? "Conta publicada! Gmail e senha foram enviados à loja — quando alguém comprar, a entrega é imediata e sua venda conclui mais rápido."
                : "Conta publicada! ⚠️ Você não adicionou Gmail/senha: quando alguém comprar, o suporte terá que te chamar e a entrega demorará mais. Na próxima, preencha 'Dados de Acesso' antes de publicar para vender mais rápido.");
        }
