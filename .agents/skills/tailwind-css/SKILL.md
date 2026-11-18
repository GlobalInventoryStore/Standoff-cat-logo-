---
name: tailwind-css
description: Desenvolver interfaces mobile-first usando Tailwind CSS, com configuração de breakpoints, purge optimization e estratégias de responsividade para iOS e Android.
example-prompt: "Crie um componente de hero section com Tailwind CSS mobile-first: tipografia escalável, imagens responsivas, botões com hover states e layout que se adapta de 320px a 1440px."
---

# Skill: tailwind-css

## Quando usar
Quando construir interfaces modernas e responsivas com utility-first CSS. Ideal para prototipagem rápida, sites marketing, dashboards administrativos e qualquer projeto que exija desenvolvimento fast com código CSS maintainable. foca em mobile-first com breakpoints configurados.

## Resultado esperado
- Código CSS menor (purge ativo remove CSS não usado)
- Layouts responsivos com `min-width` breakpoints consistentes
- Componentes reutilizáveis (buttons, cards, inputs, modals)
- Cores e tipografia centralizadas no `tailwind.config.js`
- Dark mode support quando necessário
- Performance: tempo de build < 30s para projetos medianos
- Sem CSS não utilizado no production bundle

## Workflow

1. **Inicializar Tailwind projeto**
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```
   - Configure `content:` array no `tailwind.config.js` para capturar todas as classes usadas
   - Defina `theme.extend` para cores, fonts, breakpoints personalizados

2. **Configurar breakpoints mobile-first**
   ```js
   // tailwind.config.js
   module.exports = {
     theme: {
       extend: {
         screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
         },
       },
     },
   }
   ```
   - Use `sm`, `md`, `lg`, `xl` classes diretamente no HTML
   - Mobile-first: estilos base se aplicam a todos, depois override em telas maiores

3. **Estrutura de cores e tipografia**
   ```js
   // tailwind.config.js
   module.exports = {
     theme: {
       colors: {
         primary: '#18181b',
         secondary: '#841F28',
         background: '#ffffff',
         foreground: '#18181b',
       },
       fontFamily: {
         sans: ['Inter', 'system-ui', 'sans-serif'],
         display: ['"SF Pro Display"', 'system-ui', 'sans-serif'],
       },
     },
   }
   ```
   - Cores nomeadas: use `primary`, `secondary` em vez de hex codes
   - Fontes sistemáticas para performance iOS/Android

4. **Componentes reutilizáveis**

   **Botão:**
   ```html
   <button class="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
     Clique aqui
   </button>
   ```

   **Cartão:**
   ```html
   <div class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
     <img class="w-full h-48 object-cover rounded-tlg" src="..." alt="...">
     <div class="pt-4">
       <h3 class="text-lg font-medium text-primary">Título</h3>
       <p class="text-sm text-muted-foreground">Descrição</p>
     </div>
   </div>
   ```

5. **Responsividade em prática**
   ```html
   <!-- Texto: 16px base, 2xl em telas grandes -->
   <h1 class="text-2xl md:text-4xl lg:text-5xl font-bold">
     Título responsivo
   </h1>
   
   <!-- Padding/margin: mobile primeiro -->
   <div class="p-4 md:p-6 lg:p-8">
     Conteúdo
   </div>
   
   <!-- Grid: 1 coluna mobile, 2 md, 3 lg -->
   <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
     <div>Item 1</div>
     <div>Item 2</div>
     <div>Item 3</div>
   </div>
   ```

6. **Dark mode**
   ```js
   // tailwind.config.js
   module.exports = {
     darkMode: 'class', // ou 'media' ou 'class'
   }
   ```
   - Add `class="dark"` no `<html>` ou pai componente
   - Cores dark: `dark:bg-primary-dark`, `dark:text-white`

7. **Purge / Remover CSS não usado**
   - Garanta `content:` array inclui todos os arquivos: `['./src/**/*.{html,js}', './public/index.html']`
   - Rode `npx tailwindcss -i src/input.css -o dist/output.css --minify` para production
   - Use plugins somente quando necessários (evite plugin bloat)

8. **Plugins úteis (opcional)**
   - `@tailwindcss/forms` — estilos de form resetados e consistentes
   - `@tailwindcss/typography` — elegant prose para conteúdo markdown
   - `@tailwindcss/aspect-ratio` — ratios de imagem consistentes
   - Apenas plugins que realmente usa — cada um adiciona ~1KB no build

9. **Verificar sucesso**
   - [ ] Build production gera CSS < 50KB (com purge ativo)
   - [ ] Breakpoints funcionam em: 320px, 375px, 768px, 1024px, 1440px
   - [ ] Dark mode toggle funciona e persiste
   - [ ] Componentes renderizam sem classes CSS customizadas extras
   - [ ] Tempo de desenvolvimento: hot reload < 2s
   - [ ] Código HTML usa apenas classes Tailwind (nenhum CSS externo inline)
   - [ ] Acessibilidade: focus states visíveis (`focus:ring-2`, `focus:outline-none`)

## Referências
- https://tailwindcss.com/docs
- https://tailwindcss.com/docs/responsive-design
- https://tailwindcss.com/docs/dark-mode
- https://tailwindcss.com/docs/container
- https://tailwindcss.com/docs/plugins
- https://github.com/tailwindlabs/tailwindcss-plugin-utils