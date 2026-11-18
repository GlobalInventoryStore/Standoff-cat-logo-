---
name: grid-layouts
description: Criar layouts complexos e responsivos usando CSS Grid moderno, com foco em adaptabilidade mobile-first, evitação de posicionamentos absolutos e estruturas de footer limpas conforme as regras do projeto.
example-prompt: "Crie um layout de página completo com CSS Grid: header, main content area with sidebar, e footer estruturado que se adapta de 320px a 1440px sem posicionamentos absolutos."
---

# Skill: grid-layouts

## Quando usar
Quando construir layouts de página inteiros ou componentes complexos que precisem ser totalmente responsivos e evitar posicionamentos absolutos que causem sobreposição de elementos no rodapé (footer). Aplicável a páginas de destino, dashboards, blogs e qualquer layout que exija estrutura limpa com CSS Grid.

## Resultado esperado
- Layouts que se adaptam perfeitamente de 320px (mobile) a 1440px+ (desktop)
- Nenhum posicionamento absoluto (`position: absolute` / `fixed`) que cause sobreposição no footer
- Uso de `fr` units, `grid-template-areas` e linhas nomeadas para manutenção
- Estrutura de footer fixa na bottom usando Grid ou Flexbox, não absolute positioning
- Breakpoints consistentes com o resto do projeto (mobile-first)
- Código limpo sem floats ou hacks de limpeza de clearfix

## Workflow

1. **Definir estrutura de grid global**
   ```css
   /* Reset básico */
   .page {
     min-height: 100vh;
     display: grid;
     grid-template-rows: auto 1fr auto; /* header, main, footer */
     grid-template-columns: 1fr;
     gap: 1rem;
   }
   
   /* Layout completo com grid areas */
   .page {
     grid-template-areas:
       "header"
       "main"
       "footer";
   }
   
   header { grid-area: header; }
   main { grid-area: main; }
   footer { grid-area: footer; }
   ```

2. **Responsive breakpoints with grid**
   ```css
   /* Mobile: 1 coluna */
   @media (min-width: 640px) {
     .page {
       grid-template-columns: 1fr;
     }
   }
   
   /* Tablet: 2 colunas */
   @media (min-width: 768px) {
     .page {
       grid-template-columns: 1fr 1fr;
     }
     .page {
       grid-template-areas:
         "header"
         "main sidebar"
         "footer";
     }
   }
   
   /* Desktop: 3 colunas */
   @media (min-width: 1024px) {
     .page {
       grid-template-columns: 1fr 2fr 1fr;
     }
     .page {
       grid-template-areas:
         "header header header"
         "main sidebar aside"
         "footer footer footer";
     }
   }
   ```

3. **Evitar posicionamentos absolutos no footer**
   ❌ **Errado:**
   ```css
   .footer {
     position: fixed;
     bottom: 0;
     width: 100%;
   }
   ```
   ❌ **Errado (overlap risk):**
   ```css
   .footer {
     position: absolute;
     bottom: 0;
     width: 100%;
   }
   ```
   
   ✅ **Certo (Grid natural):**
   ```css
   .page {
     grid-template-rows: auto 1fr auto;
   }
   .footer {
     background: #f8f9fa;
     padding: 2rem 1rem;
     text-align: center;
   }
   ```
   ✅ **Certo (Flexbox fallback):**
   ```css
   .page {
     display: flex;
     flex-direction: column;
     min-height: 100vh;
   }
   .footer {
     margin-top: auto;
   }
   ```

4. **Grid com named lines para facilitar**
   ```css
   .container {
     grid-template-columns: [sidebar-start] 180px [main-start] 1fr [main-end] 200px [sidebar-end];
   }
   
   .sidebar {
     grid-column: sidebar-start / sidebar-end; /* 180px + 200px = 380px */
   }
   
   .main {
     grid-column: main-start / main-end; /* 1fr do restante */
   }
   ```

5. **Gap entre colunas/linhas**
   ```css
   .grid-container {
     gap: 1.5rem; /* gap-y para rows, gap-x para columns */
     /* Suporte a navegadores mais antigos */
     -webkit-gap: 1.5rem;
     -moz-gap: 1.5rem;
   }
   ```
   - `gap` substitui `margin` + `border-spacing` + hacks de clearfix
   - Funciona em todos os navegadores modernos (Chrome 57+, Firefox 52+, Safari 10.1+)

6. **Grid Layout para componentes internos**
   ```html
   <!-- Card grid -->
   <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
     <article class="card">...</article>
     <article class="card">...</article>
     <!-- ... -->
   </div>
   
   <!-- Form layout */
   <form class="grid grid-cols-1 sm:grid-cols-2 gap-4">
     <div>
       <label class="block">Nome</label>
       <input type="text" class="mt-1 block w-full rounded border">
     </div>
     <div>
       <label class="block">Email</label>
       <input type="email" class="mt-1 block w-full rounded border">
     </div>
   </form>
   ```

7. **Verificar layout em dispositivos**
   - Teste em: iPhone SE (320px), iPhone 15 (393px), iPad (768px), Desktop 1440px
   - Use Chrome DevTools > Device Mode > Responsive
   - Verifique que footer não sobrepõe conteúdo em nenhuma largura
   - Confirme que colunas não "quebram" ou ficam em ordem errada

8. **Referências rápidas**
   - `grid-template-rows: auto 1fr auto;` — pattern footer fixo sem absolute
   - `margin-top: auto;` no footer — flexbox fallback
   - `grid-area: header / main / sidebar / footer;` — áreas nomeadas
   - `min-width: 640px;` — breakpoint sm (padrão Tailwind)

## Verificar sucesso
- [ ] Layout se adapta de 320px a 1440px+ sem overflow horizontal
- [ ] Footer stays bottom sem posicionamento absoluto nem fixed
- [ ] Nenhum elemento se sobrepõe no rodapé em nenhuma largura
- [ ] Grid areas definidas corretamente em mobile, tablet e desktop
- [ ] `gap` usado no lugar de margins para espaçamento
- [ ] Testado em iOS Safari e Android Chrome em dispositivos reais
- [ ] Código não usa `float`, `clearfix`, ou `position: absolute` para layout principal

## Referências
- https://css-tricks.com/snippets/css/complete-guide-grid/
- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout
- https://web.dev/learn/css-grid/
- https://cssgrid.io/
- https://developer.mozilla.org/en-US/docs/Web/CSS/grid_template_areas