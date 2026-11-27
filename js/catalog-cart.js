        async function inicializarAnuncios() {
            if (window.supabaseClient) {
                try {
                    const { data, error } = await window.supabaseClient.from("contas").select("*").order("id", { ascending: false });
                    if (error) {
                    } else if (Array.isArray(data)) {
                        anunciosEmMemoria = data.map(normalizarAnuncio);
                        localStorage.setItem("marktplace_stand2_anuncios", JSON.stringify(anunciosEmMemoria));
                        carregarCatalogo();
                        return;
                    }
                } catch (e) {
                    console.error("❌ Exceção ao consultar Supabase:", e);
                }
            }
            const salvos = localStorage.getItem("marktplace_stand2_anuncios");
            if (salvos) {
                try {
                    const parsed = JSON.parse(salvos);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        anunciosEmMemoria = parsed.map(normalizarAnuncio);
                        carregarCatalogo();
                        return;
                    }
                } catch (e) {}
            }
            anunciosEmMemoria = [normalizarAnuncio({
                id: "default_1",
                titulo: "Conta com M9 Bayonet & AKR",
                preco: "R$ 150,00",
                rank: "Master",
                vinculo: "Google ID",
                descricao: "• M9 Bayonet | Treasure Hunter (Pattern: 412)\n• Gloves | Carbon (Pattern: 12)\n• AKR | Sport • AWM | Scratch",
                vendedor: "Sistema",
                likes: 12,
                curtidoPormim: false,
                fotos: []
            })];
            carregarCatalogo();
        }

        function formatarPrecoMoeda(valorStr) {
            let limpo = valorStr.replace(/[^\d,.]/g, "").trim();
            if (!limpo) return "R$ 0,00";
            limpo = limpo.replace(".", ",");
            if (!limpo.includes(",")) {
                limpo = limpo + ",00";
            } else {
                let partes = limpo.split(",");
                if (partes[1].length === 1) {
                    limpo = partes[0] + "," + partes[1] + "0";
                }
            }
            return `R$ ${limpo}`;
        }

        function carregarCatalogo(filtro = null) {
            const grid = document.getElementById("catalogo-cards");
            if (!grid) return;
            grid.innerHTML = "";
            let anunciosFiltrados = anunciosEmMemoria.filter(a => !a.vendido);
            if (!anunciosFiltrados.length && anunciosEmMemoria.length) { /* todos vendidos: catálogo vazio mesmo */ }

            // Aplicar filtro de busca
            if (filtro && filtro.tipo) {
                if (filtro.tipo === "busca") {
                    const termo = filtro.termo.toLowerCase();
                    anunciosFiltrados = anunciosEmMemoria.filter(a =>
                        (a.titulo && a.titulo.toLowerCase().includes(termo)) ||
                        (a.vinculo && a.vinculo.toLowerCase().includes(termo))
                    );
                }
                if (filtro.tipo === "preco") {
                    const direcao = filtro.direcao || "menor";
                    anunciosFiltrados.sort((a, b) => {
                        const parse = (p) => parseFloat(String(p || "").replace(/[^\d,.]/g, "").replace(".", "").replace(",", ".")) || 0;
                        const pa = parse(a.preco);
                        const pb = parse(b.preco);
                        return direcao === "menor" ? pa - pb : pb - pa;
                    });
                }
            }

            const adminVendo = isAdminUsuario();
            anunciosFiltrados.forEach((anuncio, index) => {
                const item = normalizarAnuncio(anuncio);
                const vendedorCardBanido = usuarioEstaBanido(sanitizarNomePublico(item.vendedor), "");
                if (vendedorCardBanido && !adminVendo) return;
                const card = document.createElement("div");
                card.className = "bg-[#16130e] border border-[#26211a] rounded-[20px] p-5 flex flex-col justify-between hover:border-[#41382a] transition shadow-xl relative card-marketplace animate-fade-in-up fade-stagger";
                card.style.animationDelay = `${0.08 + index * 0.06}s`;
                const ehDono = currentUser && sanitizarNomePublico(currentUser.username) === sanitizarNomePublico(item.vendedor);
                const capaHtml = (item.fotos && item.fotos.length > 0) ? `<div class="w-full h-40 bg-black rounded-xl overflow-hidden mb-4 border border-[#26211a] relative"><img src="${item.fotos[0]}" alt="Capa da conta" class="w-full h-full object-cover"><span class="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] px-2 py-0.5 rounded">${item.fotos.length} foto(s)</span></div>` : "";
                let barraSuperior = "";
                if (ehDono) {
                    barraSuperior = `<div class="flex justify-between items-center mb-3 pb-2 border-b border-[#26211a]"><span class="text-[10px] text-gray-400 font-semibold uppercase">Seu Anúncio</span><button type="button" onclick="removerAnuncio('${escapeHtml(item.id)}')" class="bg-red-500/15 text-red-400 px-2 py-0.5 rounded text-xs font-bold cursor-pointer">Remover</button></div>`;
                } else if (adminVendo) {
                    barraSuperior = `<div class="flex justify-between items-center mb-3 pb-2 border-b border-[#26211a]"><span class="text-[10px] font-semibold uppercase ${vendedorCardBanido ? "text-red-400" : "text-[var(--accent)]"}">${vendedorCardBanido ? "Vendedor Banido" : "Ação Admin"}</span><span class="flex gap-1.5"><button type="button" onclick="excluirAnuncioAdmin('${escapeHtml(item.id)}')" class="bg-red-500/15 text-red-400 px-2 py-0.5 rounded text-xs font-bold cursor-pointer">Excluir</button><button type="button" onclick="alternarBanimentoVendedor('${vendedorCardBanido ? "desbanir" : "banir"}','${escapeHtml(item.id)}')" class="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-xs font-bold cursor-pointer">${vendedorCardBanido ? "Desbanir" : "Banir"}</button></span></div>`;
                }
                const corJoinha = item.curtidoPormim ? "text-[#ffffff] font-bold drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]" : "text-[#777777]";
                // Botão "Adicionar ao Carrinho" fica oculto se o anúncio for do próprio usuário logado
                const btnCarrinho = ehDono
                    ? `<button type="button" onclick="mostrarAvisoDonoConta()" class="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black py-2 rounded-xl text-xs font-bold transition cursor-pointer">⛔ Própria conta</button>`
                    : `<button type="button" onclick="adicionarAoCarrinho('${escapeHtml(item.id)}')" class="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black py-2 rounded-xl text-xs font-bold transition cursor-pointer">🛒 Adicionar ao Carrinho</button>`;
                card.innerHTML = `<div>${barraSuperior}${capaHtml}<div class="flex justify-between items-center mb-3 gap-2"><span class="bg-[#1c1812] border border-[#2f2920] text-amber-400 text-xs font-bold px-2.5 py-1 rounded uppercase">${escapeHtml(item.rank)}</span><div class="flex items-center gap-2"><button type="button" onclick="curtirAnuncio('${escapeHtml(item.id)}')" class="bg-[#1c1812] hover:bg-[#26211a] border border-[#2f2920] text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer"><span class="like-btn ${corJoinha}" id="like-${escapeHtml(item.id)}">👍</span> <span class="text-gray-300 font-semibold">${item.likes || 0}</span></button><span class="text-lg font-bold text-emerald-400">${escapeHtml(item.preco)}</span></div></div><h3 class="font-bold text-lg mb-1 text-white">${escapeHtml(item.titulo)}</h3><p class="text-xs text-[var(--muted)] mb-1">Vínculo: ${escapeHtml(item.vinculo)}</p><p class="text-xs text-gray-400 mb-3">Vendedor: ${escapeHtml(sanitizarNomePublico(item.vendedor))}</p></div><div class="space-y-2 mt-4"><button type="button" onclick="abrirDetalhes('${escapeHtml(item.id)}')" class="w-full bg-[#1c1812] hover:bg-[#26211a] border border-[#2f2920] text-white py-2 rounded-xl text-xs font-bold transition cursor-pointer">Ver Detalhes</button><button type="button" onclick="compartilharLinkAnuncio('${escapeHtml(item.id)}')" class="w-full bg-[var(--accent)] text-black py-2 rounded-xl text-xs font-bold transition cursor-pointer mt-1">📋 Compartilhar</button>${btnCarrinho}</div>`;
                grid.appendChild(card);
            });
        }

        async function curtirAnuncio(id) {
            const anuncio = anunciosEmMemoria.find(a => String(a.id) === String(id));
            if (!anuncio) return;
            const likesAtual = Number(anuncio.likes || 0);
            const proximoCurtido = !Boolean(anuncio.curtidoPormim);
            const proximoLikes = proximoCurtido ? likesAtual + 1 : Math.max(0, likesAtual - 1);
            anuncio.curtidoPormim = proximoCurtido;
            anuncio.likes = proximoLikes;
            if (proximoCurtido) eventosGtag('anuncio_curtido', { item_id: String(id) });
            localStorage.setItem("marktplace_stand2_anuncios", JSON.stringify(anunciosEmMemoria));
            carregarCatalogo();
            if (window.supabaseClient && ehIdNumerico(anuncio.id)) {
                try {
                    const { error } = await window.supabaseClient.from("contas").update({
                        curtidoPormim: proximoCurtido,
                        likes: proximoLikes
                    }).eq("id", Number(anuncio.id));
                    if (error) {}
                } catch (e) {}
            }
        }

        function detalheEhSuaConta() {
            return Boolean(currentUser && anuncioSelecionadoAtual && sanitizarNomePublico(currentUser.username) === sanitizarNomePublico(anuncioSelecionadoAtual.vendedor));
        }
        function mostrarAvisoDonoConta() {
    mostrarAlerta("Conta", "Esta é a sua própria conta. Você não pode comprar seu próprio anúncio.", "aviso");
}

function adicionarAoCarrinho(id) {
    const anuncio = anunciosEmMemoria.find(a => String(a.id) === String(id));
    if (!anuncio) return;
    // Bloquear adicionar própria conta ao carrinho
    if (currentUser && sanitizarNomePublico(currentUser.username) === sanitizarNomePublico(anuncio.vendedor)) {
        mostrarAlerta("Conta", "Não é possível adicionar sua própria conta ao carrinho.", "erro");
        return;
    }
    // Fonte única de verdade: recarrega do localStorage antes de mutar (evita estado velho em memória)
    recarregarCarrinhoDoStorage();
    if (carrinhoItens.some(item => String(item.id) === String(id))) {
        atualizarBadgeCarrinho();
        mostrarAlerta("Carrinho", "Este item já está no seu carrinho!", "aviso");
        return;
    }
    carrinhoItens.push(anuncio);
    localStorage.setItem("marktplace_stand2_cart", JSON.stringify(carrinhoItens));
    atualizarBadgeCarrinho();
    var precoNum = parseFloat(String(anuncio.preco || "0").replace("R$", "").replace(".", "").replace(",", ".")) || 0;
    eventosGtag("add_to_cart", { currency: "BRL", value: precoNum, items: [{ item_id: String(anuncio.id), item_name: anuncio.titulo || "Conta Standoff 2", price: precoNum }] });
    mostrarAlerta("Sucesso", "Conta adicionada ao carrinho!");
}

        function adicionarAoCarrinhoAtual() {
            if (!anuncioSelecionadoAtual) return;
            // Bloquear se for própria conta
            if (detalheEhSuaConta()) { mostrarAlerta("Conta", "Não é possível comprar sua própria conta.", "erro"); return; }
            closeDetalhes();
            adicionarAoCarrinho(anuncioSelecionadoAtual.id);
        }

        function atualizarBadgeCarrinho() {
            const badge = document.getElementById("cart-badge");
            if (badge) badge.textContent = carrinhoItens.length;
        }

        function abrirCarrinho() {
            var totalAberto = 0;
            carrinhoItens.forEach(function (item) { totalAberto += parseFloat(String(item.preco || "0").replace("R$", "").replace(".", "").replace(",", ".")) || 0; });
            eventosGtag("view_cart", { currency: "BRL", value: totalAberto });
            const container = document.getElementById("carrinho-itens");
            const totalEl = document.getElementById("carrinho-total");
            container.innerHTML = "";
            if (carrinhoItens.length === 0) {
                container.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">Seu carrinho está vazio.</p>';
                totalEl.textContent = "R$ 0,00";
            } else {
                let totalSoma = 0;
                carrinhoItens.forEach((item, index) => {
                    let numPreco = parseFloat(item.preco.replace("R$", "").replace(".", "").replace(",", ".").trim()) || 0;
                    totalSoma += numPreco;
                    const div = document.createElement("div");
                    div.className = "flex justify-between items-center bg-[#050505] p-3 rounded-xl border border-[#26211a]";
                    div.innerHTML = `<div><p class="text-xs font-bold text-white">${escapeHtml(item.titulo)}</p><span class="text-xs text-emerald-400 font-semibold">${escapeHtml(item.preco)}</span></div><button type="button" onclick="removerDoCarrinho(${index})" class="text-red-400 hover:text-red-300 text-xs font-bold bg-red-500/10 px-2 py-1 rounded cursor-pointer">Remover</button>`;
                    container.appendChild(div);
                });
                totalEl.textContent = `R$ ${totalSoma.toFixed(2).replace(".", ",")}`;
            }
            setModalVisivel("modal-carrinho", true);
        }

        function closeCarrinho() { setModalVisivel("modal-carrinho", false); }

        function removerDoCarrinho(index) {
            recarregarCarrinhoDoStorage();
            carrinhoItens.splice(index, 1);
            localStorage.setItem("marktplace_stand2_cart", JSON.stringify(carrinhoItens));
            atualizarBadgeCarrinho();
            abrirCarrinho();
        }

        function finalizarCompraCarrinho() {
            if (carrinhoItens.length === 0) { mostrarAlerta("Aviso", "Seu carrinho está vazio.", "aviso"); return; }
            var totalFin = 0;
            carrinhoItens.forEach(function (item) { totalFin += parseFloat(String(item.preco || "0").replace("R$", "").replace(".", "").replace(",", ".")) || 0; });
            eventosGtag("begin_checkout", { currency: "BRL", value: totalFin });
            closeCarrinho();
            if (!currentUser) { mostrarAlerta("Login Necessário", "Entre na sua conta para finalizar o pagamento.", "aviso"); openModal(); return; }
            resetarFormaPagamento();
            setModalVisivel("modal-checkout", true);
        }

        function abrirCheckoutDireto() {
            if (!currentUser) { closeDetalhes(); mostrarAlerta("Login Necessário", "Entre para comprar.", "aviso"); openModal(); return; }
            // Bloquear se for própria conta
            if (detalheEhSuaConta()) { mostrarAlerta("Conta", "Não é possível comprar sua própria conta.", "erro"); return; }
            closeDetalhes();
            recarregarCarrinhoDoStorage();
            if (anuncioSelecionadoAtual && !carrinhoItens.some(i => String(i.id) === String(anuncioSelecionadoAtual.id))) {
                carrinhoItens.push(anuncioSelecionadoAtual);
                try { localStorage.setItem("marktplace_stand2_cart", JSON.stringify(carrinhoItens)); } catch (e) {}
                atualizarBadgeCarrinho();
            }
            var precoDireto = parseFloat(String((anuncioSelecionadoAtual || {}).preco || "0").replace("R$", "").replace(".", "").replace(",", ".")) || 0;
            eventosGtag("begin_checkout", { currency: "BRL", value: precoDireto });
            resetarFormaPagamento();
            setModalVisivel("modal-checkout", true);
        }
        function closeCheckout() { setModalVisivel("modal-checkout", false); }

        // Reseta a forma de pagamento a cada abertura: nada de seleção antiga em cache.
        function resetarFormaPagamento() {
            const sel = document.getElementById("select-parcelas");
            if (sel) sel.value = "1";
            const radioPix = document.querySelector('input[name="pagamento"][value="pix"]');
            if (radioPix) {
                radioPix.checked = true;
                if (typeof mudarMetodoPagamento === "function") mudarMetodoPagamento("pix");
            }
        }

        function mudarMetodoPagamento(metodo) {
            const caixaCartao = document.getElementById("container-campos-cartao");
            if (metodo === "credito") {
                caixaCartao.classList.remove("hidden");
            } else {
                caixaCartao.classList.add("hidden");
            }
        }

        async function carregarMeusAnuncios() {
            // Verificar se usuário está logado
            if (!currentUser) {
                openModal();
                return;
            }

            // Mostrar esconder seção
            const secao = document.getElementById("meus-anuncios");
            const mensagem = document.getElementById("mensagem-sem-anuncios");
            const lista = document.getElementById("lista-anuncios-vendidos");

            if (secao) secao.classList.remove("hidden");
            if (mensagem) mensagem.style.display = "none";
            if (lista) lista.innerHTML = "";

            try {
                const { data } = await window.supabaseClient.from("contas").select("*").ilike("vendedor", `%${currentUser.email}%`).order("created_at", { ascending: false });
                if (data && data.length > 0) {
                    mensagem.style.display = "none";
                    data.forEach(anuncio => {
                        const div = document.createElement("div");
                        div.className = "bg-[#16130e] border border-[#2f2920] rounded-xl p-4 mb-4";
                        div.innerHTML = `
                            <h3 class="font-bold text-white">${escapeHtml(anuncio.titulo)}</h3>
                            <p class="text-[var(--muted)] mb-2">Preço: ${anuncio.preco}</p>
                            <p class="text-[var(--muted)] text-xs">Status: ${anuncio.status || "Disponível"}</p>
                            <button class="mt-2 w-full bg-[var(--accent)] text-black py-2 rounded-xl text-sm hover:bg-emerald-600 transition">Gerenciar</button>
                        `;
                        lista.appendChild(div);
                    });
                } else {
                    mensagem.style.display = "block";
                    mensagem.innerHTML = "Nenhum anúncio encontrado. <a href='#' onclick='verificarAutenticacaoAnuncio(); return false;' class='text-[var(--accent)] hover:underline'>Publicar sua primeira conta</a>.";
                }
            } catch (e) {
                console.error("Erro ao carregar meus anúncios:", e);
                if (mensagem) {
                    mensagem.style.display = "block";
                    mensagem.innerHTML = "Erro ao carregar anúncios. Tente novamente mais tarde.";
                }
            }
        }

        // Função para gerar e compartilhar link direto do anúncio
        function compartilharLinkAnuncio(id) {
            const link = window.location.origin + window.location.pathname + `?conta=${id}`;
            navigator.clipboard.writeText(link).then(() => {
                mostrarAlerta("Link", "Link copiado para a área de transferência!", "sucesso");
            }).catch(() => {
                // Fallback para navegadores antigos
                const textarea = document.createElement("textarea");
                textarea.value = link;
                document.body.appendChild(textarea);
                textarea.select();
                try { document.execCommand("copy"); } catch (e) {}
                document.body.removeChild(textarea);
                mostrarAlerta("Link", "Link copiado para a área de transferência!", "sucesso");
            });

            // Feedback visual
            const originalText = event.target.textContent;
            event.target.textContent = "Link copiado!";
            setTimeout(() => { event.target.textContent = originalText; }, 2000);
        }

        // Inicializar filtros ao carregar página
        document.addEventListener("DOMContentLoaded", () => {
            const btnAplicarFiltro = document.getElementById("btnAplicarFiltro");
            const filtroBusca = document.getElementById("filtroBusca");
            const filtroPreco = document.getElementById("filtroPreco");

            if (btnAplicarFiltro) {
                btnAplicarFiltro.addEventListener("click", () => {
                    carregarCatalogo({
                        tipo: filtroPreco.value ? "preco" : "busca",
                        termo: filtroBusca.value,
                        direcao: filtroPreco.value === "menor" ? "menor" : "maior"
                    });
                });
            }

            // Aplicar filtro ao pressionar Enter no buscador
            if (filtroBusca) {
                filtroBusca.addEventListener("keypress", (e) => {
                    if (e.key === "Enter") {
                        carregarCatalogo({ tipo: "busca", termo: filtroBusca.value });
                    }
                });
            }

            // Verificar parâmetro ?conta=ID na URL e abrir detalhes
            const urlParams = new URLSearchParams(window.location.search);
            const contaId = urlParams.get("conta");
            if (contaId) {
                // Buscar o anúncio e abrir detalhes
                const anuncio = anunciosEmMemoria.find(a => String(a.id) === String(contaId));
                if (anuncio) {
                    anuncioSelecionadoAtual = anuncio;
                    abrirDetalhes(contaId);
                }
            }
        });
