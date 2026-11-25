        function isAdminUsuario() {
            return Boolean(currentUser && currentUser.email && ehEmailAdmin(currentUser.email));
        }

        function carregarBanidos() {
            try {
                const lista = JSON.parse(localStorage.getItem(CHAVE_STORAGE_BANIDOS) || "[]");
                return Array.isArray(lista) ? lista : [];
            } catch (e) {
                return [];
            }
        }

        function salvarBanidos(lista) {
            localStorage.setItem(CHAVE_STORAGE_BANIDOS, JSON.stringify(lista));
        }

        function usuarioEstaBanido(nome, email) {
            const alvoNome = (nome || "").toLowerCase();
            const alvoEmail = (email || "").toLowerCase();
            if (!alvoNome && !alvoEmail) return false;
            return carregarBanidos().some(b => {
                const confereNome = Boolean(b && b.nome && alvoNome && String(b.nome).toLowerCase() === alvoNome);
                const confereEmail = Boolean(b && b.email && alvoEmail && String(b.email).toLowerCase() === alvoEmail);
                return confereNome || confereEmail;
            });
        }

        function resolverEmailDoVendedor(nomeVendedor) {
            try {
                const users = JSON.parse(localStorage.getItem("marktplace_stand2_db_users") || "[]");
                const u = users.find(x => sanitizarNomePublico(x.username) === sanitizarNomePublico(nomeVendedor));
                return u ? (u.email || "") : "";
            } catch (e) {
                return "";
            }
        }

        async function sincronizarBanidosSupabase() {
            if (!window.supabaseClient) return;
            try {
                const { data, error } = await window.supabaseClient.from("usuarios_banidos").select("nome,email");
                if (!error && Array.isArray(data)) {
                    const lista = carregarBanidos();
                    let mudou = false;
                    for (const b of data) {
                        if (b && b.nome && !lista.some(x => (x.nome || "").toLowerCase() === String(b.nome).toLowerCase())) {
                            lista.push({ nome: String(b.nome), email: b.email || "", data: "" });
                            mudou = true;
                        }
                    }
                    if (mudou) {
                        salvarBanidos(lista);
                        carregarCatalogo();
                    }
                }
            } catch (e) {}
        }

        async function excluirAnuncioAdmin(id) {
            if (!isAdminUsuario()) { mostrarAlerta("Admin", "Apenas a conta admin pode excluir anúncios.", "aviso"); return; }
            const alvo = anunciosEmMemoria.find(a => String(a.id) === String(id));
            if (!alvo) { mostrarAlerta("Admin", "Anúncio não encontrado.", "aviso"); return; }
            await removerAnuncio(id);
            mostrarAlerta("Admin", `Anúncio "${sanitizarNomePublico(alvo.titulo)}" excluído do Supabase e do catálogo.`);
        }

        async function excluirAnuncioAdminSelecionado() {
            if (!anuncioSelecionadoAtual) return;
            const id = anuncioSelecionadoAtual.id;
            closeDetalhes();
            await excluirAnuncioAdmin(id);
        }

        async function banirVendedorDoAnuncio(id) {
            if (!isAdminUsuario()) return;
            const anuncio = anunciosEmMemoria.find(a => String(a.id) === String(id));
            if (!anuncio) return;
            const nome = sanitizarNomePublico(anuncio.vendedor);
            if (currentUser && nome === sanitizarNomePublico(currentUser.username)) { mostrarAlerta("Admin", "Você não pode banir a própria conta admin.", "aviso"); return; }
            if (!confirm(`Banir o usuário "${nome}"? Os anúncios dele saem do catálogo e ele não poderá publicar.`)) return;
            const lista = carregarBanidos();
            if (!lista.some(b => (b.nome || "").toLowerCase() === nome.toLowerCase())) {
                lista.push({ nome, email: resolverEmailDoVendedor(nome), data: new Date().toISOString() });
                salvarBanidos(lista);
            }
            if (window.supabaseClient) {
                try {
                    await window.supabaseClient.from("usuarios_banidos").insert([{ nome, email: resolverEmailDoVendedor(nome) }]);
                } catch (e) {}
            }
            const idsDoVendedor = anunciosEmMemoria
                .filter(a => sanitizarNomePublico(a.vendedor) === nome)
                .map(a => String(a.id));
            for (const idAnuncio of idsDoVendedor) {
                try { await removerAnuncio(idAnuncio); } catch (e) {}
            }
            if (anuncioSelecionadoAtual && idsDoVendedor.includes(String(anuncioSelecionadoAtual.id))) {
                closeDetalhes();
            }
            carregarCatalogo();
            mostrarAlerta("Admin", `Usuário "${nome}" banido. Anúncios dele removidos do catálogo e publicação bloqueada.`, "aviso");
        }

        async function desbanirVendedorDoAnuncio(id) {
            if (!isAdminUsuario()) return;
            const anuncio = anunciosEmMemoria.find(a => String(a.id) === String(id));
            if (!anuncio) return;
            const nome = sanitizarNomePublico(anuncio.vendedor);
            if (!confirm(`Desbanir o usuário "${nome}"? Os anúncios dele voltam ao catálogo quando recarregar.`)) return;
            salvarBanidos(carregarBanidos().filter(b => (b.nome || "").toLowerCase() !== nome.toLowerCase()));
            if (window.supabaseClient) {
                try {
                    await window.supabaseClient.from("usuarios_banidos").delete().eq("nome", nome);
                } catch (e) {}
            }
            carregarCatalogo();
            mostrarAlerta("Admin", `Usuário "${nome}" desbanido.`);
        }

        async function alternarBanimentoVendedor(action, id) {
            if (action === "banir") { await banirVendedorDoAnuncio(id); }
            else { await desbanirVendedorDoAnuncio(id); }
        }

        async function openPainelBanidos() {
            if (!isAdminUsuario()) { mostrarAlerta("Admin", "Apenas a conta admin pode abrir este painel.", "aviso"); return; }
            try { await sincronizarBanidosSupabase(); } catch (e) {}
            renderizarListaBanidos();
            setModalVisivel("modal-banidos", true);
        }

        function closeBanidos() { setModalVisivel("modal-banidos", false); }

        function renderizarListaBanidos() {
            const lista = document.getElementById("lista-banidos");
            if (!lista) return;
            const banidos = carregarBanidos();
            if (!banidos.length) {
                lista.innerHTML = `<p class="text-xs text-[var(--muted)] text-center py-4">Nenhum usuário banido no momento.</p>`;
                return;
            }
            lista.innerHTML = banidos.map(b => {
                const nome = sanitizarNomePublico(b.nome || "Usuário");
                const email = b.email ? `<span class="block text-[10px] text-[var(--muted)]">${escapeHtml(b.email)}</span>` : "";
                return `<div class="flex justify-between items-center gap-2 bg-[#14110c] border border-[#26211a] rounded-xl px-3 py-2.5"><div class="min-w-0"><p class="text-xs font-bold text-white truncate">${escapeHtml(nome)}</p>${email}</div><button type="button" onclick="desbanirUsuarioPainel('${escapeHtml(b.nome || "")}')" class="bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap">Desbanir</button></div>`;
            }).join("");
        }

        async function desbanirUsuarioPainel(nome) {
            if (!isAdminUsuario()) return;
            const nomeLimpo = sanitizarNomePublico(nome);
            if (!confirm(`Desbanir o usuário "${nomeLimpo}"? Os anúncios dele voltam ao catálogo quando recarregar.`)) return;
            salvarBanidos(carregarBanidos().filter(b => (b.nome || "").toLowerCase() !== nomeLimpo.toLowerCase()));
            if (window.supabaseClient) {
                try {
                    await window.supabaseClient.from("usuarios_banidos").delete().eq("nome", nomeLimpo);
                } catch (e) {}
            }
            renderizarListaBanidos();
            carregarCatalogo();
            mostrarAlerta("Admin", `Usuário "${nomeLimpo}" desbanido.`);
        }

        async function alternarBanimentoVendedorSelecionado() {
            if (!anuncioSelecionadoAtual) return;
            const btnBan = document.getElementById("btn-banir-detalhes");
            const acao = btnBan && btnBan.dataset.acao === "desbanir" ? "desbanir" : "banir";
            const id = anuncioSelecionadoAtual.id;
            const estaAberto = document.getElementById("modal-detalhes").style.display === "flex";
            if (estaAberto) closeDetalhes();
            await alternarBanimentoVendedor(acao, id);
            if (estaAberto && anunciosEmMemoria.some(a => String(a.id) === String(id))) {
                abrirDetalhes(id);
            }
        }

        async function removerAnuncio(id) {
            const alvo = anunciosEmMemoria.find(a => String(a.id) === String(id));
            anunciosEmMemoria = anunciosEmMemoria.filter(a => String(a.id) !== String(id));
            localStorage.setItem("marktplace_stand2_anuncios", JSON.stringify(anunciosEmMemoria));
            carregarCatalogo();
            const idBanco = alvo && ehIdNumerico(alvo.id) ? Number(alvo.id) : (ehIdNumerico(id) ? Number(id) : null);
            if (window.supabaseClient && idBanco !== null) {
                try {
                    const { error } = await window.supabaseClient.from("contas").delete().eq("id", idBanco);
                    if (error) {}
                } catch (e) {}
            }
        }

        function abrirDetalhes(id) {
            const encontrado = anunciosEmMemoria.find(a => String(a.id) === String(id));
            if (!encontrado) return;
            anuncioSelecionadoAtual = normalizarAnuncio(encontrado);
            document.getElementById("detalhe-titulo").textContent = anuncioSelecionadoAtual.titulo;
            document.getElementById("detalhe-preco").textContent = anuncioSelecionadoAtual.preco;
            document.getElementById("detalhe-badge").textContent = anuncioSelecionadoAtual.rank;
            document.getElementById("detalhe-vinculo").textContent = anuncioSelecionadoAtual.vinculo;
            document.getElementById("detalhe-desc").textContent = anuncioSelecionadoAtual.descricao ?? anuncioSelecionadoAtual.desc;
            document.getElementById("detalhe-vendedor").textContent = sanitizarNomePublico(anuncioSelecionadoAtual.vendedor);
            const imgContainer = document.getElementById("detalhe-img-container");
            const imgElement = document.getElementById("detalhe-imagem");
            const minis = document.getElementById("detalhe-miniaturas");
            minis.innerHTML = "";
            if (anuncioSelecionadoAtual.fotos && anuncioSelecionadoAtual.fotos.length > 0) {
                imgElement.src = anuncioSelecionadoAtual.fotos[0];
                imgContainer.classList.remove("hidden");
                anuncioSelecionadoAtual.fotos.forEach((url, idx) => {
                    const thumb = document.createElement("img");
                    thumb.src = url;
                    thumb.alt = `Miniatura ${idx + 1}`;
                    thumb.className = `w-12 h-12 object-cover rounded cursor-pointer border-2 ${idx === 0 ? "border-[var(--accent)]" : "border-transparent"}`;
                    thumb.onclick = () => { imgElement.src = url; };
                    minis.appendChild(thumb);
                });
            } else {
                imgContainer.classList.add("hidden");
            }
            const acoesAdmin = document.getElementById("detalhes-acoes-admin");
            if (acoesAdmin) {
                if (isAdminUsuario()) {
                    acoesAdmin.classList.remove("hidden");
                    const btnBan = document.getElementById("btn-banir-detalhes");
                    if (btnBan) {
                        const vendedorBanido = usuarioEstaBanido(sanitizarNomePublico(anuncioSelecionadoAtual.vendedor), "");
                        btnBan.textContent = vendedorBanido ? "♻️ Desbanir Vendedor" : "🚫 Banir Vendedor";
                        btnBan.dataset.acao = vendedorBanido ? "desbanir" : "banir";
                    }
                } else {
                    acoesAdmin.classList.add("hidden");
                }
            }
            setModalVisivel("modal-detalhes", true);
        }

        function closeDetalhes() { setModalVisivel("modal-detalhes", false); }
