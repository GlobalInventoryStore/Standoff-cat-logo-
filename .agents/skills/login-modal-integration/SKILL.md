---
name: Login Modal Integration
description: Integra um modal de login e registro com pers LocalStorage, tema
  escuro e alto z-index para menus móveis.
---

1. Inserir botão no header: Coloque `<button class="btn-secondary open-modal">Entrar / Cadastrar</button>` após o logo do header. **Regra:** Se o botão estiver dentro de um container com z-index baixo, ele ficará atrás de outros elementos; garantir que o pai tenha posição relativa e z-index adequado.

2. Inserir modal antes de `</body>`: Cole o HTML do modal com overlay de z-index alto (ex: 1000), fundo escuro semitransparente e abas `login`/`register` com IDs correspondentes. **Regra:** Sem `overflow: hidden` no body ao abrir o modal, a página pode rolar indesejadamente; sempre definir `document.body.style.overflow = 'hidden'` ao exibir o modal.

3. Adicionar script JavaScript antes de `</body>`: Inclua o código com funções `openModal`, `closeModal`, `showTab`, `handleLogin`, `handleRegister` e `persistUser`, salvando dados em `localStorage['standoff2_user']`. **Regra:** Se a chave do `localStorage` não for consistente entre o salvamento e a leitura, o usuário não será reconhecido como logged; usar a mesma chave em todos os lugares.
