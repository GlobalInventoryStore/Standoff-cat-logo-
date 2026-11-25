
        window.fecharMenuMobile = function() {
            const menu = document.getElementById("mobile-menu");
            if (menu) {
                menu.classList.add("hidden");
                menu.classList.remove("menu-aberto");
            }
            const btn = document.getElementById("hamburger-btn");
            if (btn) btn.setAttribute("aria-expanded", "false");
        };

        // Foco antes da abertura, para devolvê-lo ao fechar (acessibilidade).
        const focoAnteriorPorModal = new WeakMap();

        // Prepara o card rolável do modal e devolve o elemento que deve receber o foco.
        window.prepararFocoModal = function(modal) {
            const card = modal.firstElementChild;
            if (!card) return modal;
            card.classList.add("modal-card");
            if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "-1");

            // Se o próprio card tiver conteúdo excedente, ele é o alvo do foco.
            let alvo = (card.scrollHeight > card.clientHeight + 2 && card.clientHeight > 0) ? card : null;
            if (!alvo) {
                const areas = card.querySelectorAll("[data-modal-scroll], #chat-mensagens, [class*='overflow-y-auto']");
                for (const area of areas) {
                    if (area.clientHeight > 0 && area.scrollHeight > area.clientHeight + 2) { alvo = area; break; }
                }
            }
            if (!alvo) alvo = card;
            if (!alvo.hasAttribute("tabindex")) alvo.setAttribute("tabindex", "-1");
            return alvo;
        };

        window.setModalVisivel = function(modalId, aberto) {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            if (!aberto && modalId === "modal-rastreio" && typeof window.pararAutoRefreshRastreio === "function") {
                window.pararAutoRefreshRastreio();
            }
            const containers = document.querySelectorAll(".carrinho-itens, [class*='overflow-y-auto'], [class*='space-y-3']");
            if (aberto) {
                const jaAberto = modal.classList.contains("is-open");
                if (!jaAberto) focoAnteriorPorModal.set(modal, document.activeElement);
                modal.classList.remove("hidden");
                modal.classList.add("is-open");
                modal.style.display = "flex";
                modal.scrollTop = 0;
                const alvo = window.prepararFocoModal(modal);
                if (!jaAberto && alvo.scrollTop) alvo.scrollTop = 0;
                try { alvo.focus({ preventScroll: true }); } catch (e) { alvo.focus(); }
                if (document.body.style.overflow !== "hidden" && document.body.dataset.modalOverflow === undefined) {
                    document.body.dataset.modalOverflow = document.body.style.overflow || "";
                }
                document.body.style.overflow = "hidden";
                document.body.style.overscrollBehavior = "contain";
                document.body.classList.add("modal-open");
                containers.forEach(el => { el.style.overscrollBehavior = "contain"; });
            } else {
                modal.classList.add("hidden");
                modal.classList.remove("is-open");
                modal.style.display = "none";
                const ativo = document.activeElement;
                if (ativo && modal.contains(ativo) && typeof ativo.blur === "function") ativo.blur();
                const anterior = focoAnteriorPorModal.get(modal);
                focoAnteriorPorModal.delete(modal);
                if (anterior && anterior.isConnected && typeof anterior.focus === "function") {
                    try { anterior.focus({ preventScroll: true }); } catch (e) { anterior.focus(); }
                }
                if (!document.querySelector(".modal-backdrop.is-open")) {
                    document.body.style.overflow = document.body.dataset.modalOverflow || "";
                    delete document.body.dataset.modalOverflow;
                    document.body.style.overscrollBehavior = "";
                    document.body.classList.remove("modal-open");
                }
                containers.forEach(el => { el.style.overscrollBehavior = ""; });
            }
        };

        // Fechamento padrão: clique no overlay escuro ou tecla Esc.
        // O modal obrigatório de Termos (primeiro acesso) nunca fecha sozinho.
        window.fecharModalPorOverlay = function(modal) {
            if (!modal || modal.id === "modal-boas-vindas") return;
            const fechadores = {
                "modal": "closeModal",
                "modal-termos": "closeTermosModal",
                "modal-rastreio": "closeRastreioPedido",
                "modal-config": "closeConfiguracoes",
                "modal-banidos": "closeBanidos",
                "modal-carrinho": "closeCarrinho",
                "modal-verificar-anuncio": "closeVerificarAnuncio",
                "modal-anuncio": "closeAnuncioModal",
                "modal-detalhes": "closeDetalhes",
                "modal-checkout": "closeCheckout",
                "modal-pagamento-detalhes": "closePagamentoDetalhes",
                "modal-ticket": "closeTicketModal",
                "modal-chat-suporte": "closeChatSuporte",
                "modal-alerta": "fecharAlerta",
                "modal-contestacao": "fecharContestacao",
                "modal-como-funcionamos": "closeModalComoFunciona"
            };
            const fn = fechadores[modal.id];
            if (fn && typeof window[fn] === "function") window[fn]();
            else window.setModalVisivel(modal.id, false);
        };

        document.addEventListener("DOMContentLoaded", function() {
            document.addEventListener("click", function(ev) {
                if (!ev.target || !ev.target.closest) return;
                const modal = ev.target.closest(".modal-backdrop.is-open");
                if (modal && ev.target === modal) window.fecharModalPorOverlay(modal);
            });
            document.addEventListener("keydown", function(ev) {
                if (ev.key !== "Escape") return;
                const modal = document.querySelector(".modal-backdrop.is-open");
                if (modal) window.fecharModalPorOverlay(modal);
            });
        });
    
        document.addEventListener("DOMContentLoaded", function() {
            // Menu hambúrguer: wiring independente — falha em qualquer inicialização abaixo não pode deixar o botão morto
            try {
                const hamburgerBtn = document.getElementById("hamburger-btn");
                const mobileMenu = document.getElementById("mobile-menu");
                if (hamburgerBtn && mobileMenu) {
                    hamburgerBtn.addEventListener("click", function(e) {
                        e.stopPropagation();
                        const abrir = mobileMenu.classList.contains("hidden");
                        mobileMenu.classList.toggle("hidden", !abrir);
                        mobileMenu.classList.toggle("menu-aberto", abrir);
                        hamburgerBtn.setAttribute("aria-expanded", abrir ? "true" : "false");
                    });
                    document.addEventListener("click", function(e) {
                        if (!mobileMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
                            fecharMenuMobile();
                        }
                    });
                    mobileMenu.querySelectorAll(".menu-link").forEach(link => {
                        link.addEventListener("click", function() {
                            fecharMenuMobile();
                        });
                    });
                }
            } catch (err) {
                console.warn("Falha ao inicializar o menu hambúrguer:", err);
            }

            [carregarEstadoLocalSeguro, carregarAvataresRegistro, carregarCatalogo, inicializarAnuncios, sincronizarBanidosSupabase].forEach(function(fn) {
                try { fn(); } catch (err) { console.warn("Falha na inicialização:", fn && fn.name, err); }
            });

            try { processarAutoConclusao(); } catch (err) { console.warn("Auto-conclusão falhou:", err); }
            setInterval(function() {
                processarAutoConclusao().then(function(mudou) {
                    if (mudou && isAdminUsuario()) { consultarStatusPedido(true); }
                }).catch(function() {});
            }, 10 * 60 * 1000);
        });

        function concordarTermosEntrada() {
            localStorage.setItem("marktplace_stand2_termos", "true");
            setModalVisivel("modal-boas-vindas", false);
        }

        function mostrarAlerta(titulo, texto, tipo = "sucesso") {
            document.getElementById("alerta-titulo").textContent = titulo;
            document.getElementById("alerta-texto").textContent = texto;
            const icone = document.getElementById("alerta-icone");
            if (tipo === "sucesso") {
                icone.className = "alerta-icone-ok";
                icone.textContent = "✓";
            } else {
                icone.className = "alerta-icone-aviso";
                icone.textContent = "!";
            }
            setModalVisivel("modal-alerta", true);
        }

        function fecharAlerta() {
            setModalVisivel("modal-alerta", false);
        }

        function carregarAvataresRegistro() {
            const grid = document.getElementById("avatars-grid");
            if (!grid) return;
            grid.innerHTML = "";
            AVATARES.forEach((url) => {
                const img = document.createElement("img");
                img.src = url;
                img.className = "w-10 h-10 rounded-full cursor-pointer border-2 border-transparent hover:border-[var(--accent)] transition p-1 bg-[#050505]";
                img.onclick = function() {
                    document.querySelectorAll("#avatars-grid img").forEach(i => i.classList.remove("border-[var(--accent)]"));
                    img.classList.add("border-[var(--accent)]");
                    document.getElementById("selected-avatar").value = url;
                };
                grid.appendChild(img);
            });
            if (grid.firstChild) grid.firstChild.click();
        }

        function showTab(tab, event) {
            document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
            document.querySelectorAll(".tab").forEach(el => el.classList.remove("active"));
            document.getElementById(tab + "-tab").classList.add("active");
            if (event && event.currentTarget) event.currentTarget.classList.add("active");
        }

        function openModal() { setModalVisivel("modal", true); fecharMenuMobile(); }
        function closeModal() { setModalVisivel("modal", false); }
        function openTermosModal() { setModalVisivel("modal-termos", true); }
        function closeTermosModal() { setModalVisivel("modal-termos", false); }

        (function() {
            const header = document.querySelector("header.sticky");
            if (!header) return;
            let lastScrollY = window.scrollY;
            const hideThreshold = 80;
            const showMinDelta = 20;
            const showNearTop = 120;
            const updateHeader = () => {
                const currentScrollY = window.scrollY;
                const scrollDelta = lastScrollY - currentScrollY;
                if (currentScrollY > hideThreshold && currentScrollY > lastScrollY) {
                    header.style.transform = "translateY(-100%)";
                    header.style.opacity = "0";
                } else if (scrollDelta > showMinDelta && currentScrollY < showNearTop) {
                    header.style.transform = "translateY(0)";
                    header.style.opacity = "1";
                }
                lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;
            };
            let ticking = false;
            window.addEventListener("scroll", () => {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        updateHeader();
                        ticking = false;
                    });
                    ticking = true;
                }
            }, { passive: true });
            updateHeader();
        })();
