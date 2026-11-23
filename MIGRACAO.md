# Migração para novo contêiner — MARKTPLACE stand2

Como injetar as chaves com segurança no contêiner novo (nada de chave no git além das públicas de leitura).

## 1. Código
```bash
git clone https://github.com/GlobalInventoryStore/Standoff-cat-logo-.git
cd Standoff-cat-logo-
```

## 2. Chaves: gere o config.js (mandatório antes de servir o site)
```bash
cp env.example .env       # ou escreva o .env do seu jeito
nano .env                  # preencha SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, EMAILJS_*, CODIGO_ADMIN_FIXO...
node scripts/gerar-config.mjs   # gera o config.js na raiz
```

- `config.js` e `.env` estão no `.gitignore`: vão só no seu contêiner, nunca no repositório.
- Em contêiner/CI, em vez de arquivo, defina as mesmas variáveis no ambiente e rode `node scripts/gerar-config.mjs` no comando de build/start.
- Docker: `docker run --env-file .env -p 8080:80 imagem` com build que roda o script acima; ou monte o `config.js` como volume: `-v ./config.js:/usr/share/nginx/html/config.js`.

## 3. O que ainda é público no HTML (por design, não é segredo)
Num site 100% estático, a **chave publishable do Supabase** e as chaves públicas do **EmailJS** são feitas para circular no navegador — qualquer visitante as vê de qualquer forma. A proteção real está em:
- **RLS no Supabase** (policies: DELETE só para os dois e-mails de admin autenticados — veja o SQL da conversa/AGENTS.md).
- **Nunca** colocar a chave `service_role` do Supabase no HTML, no git ou em ferramenta de frontend.

Por isso o índice destas chaves fica embutido como *fallback* para o GitHub Pages não quebrar; o `config.js` sobrescreve o que estiver definido. Se quiser removê-las do HTML de vez, rode este site por um host com build (Netlify/Vercel: cole as variáveis no painel e use `node scripts/gerar-config.mjs &&` antes do publish).

## 4. Segredo de verdade: CODIGO_ADMIN_FIXO
O código fixo do admin **não existe mais no código-fonte**: só entra via `config.js`/ambiente. Sem ele, o admin passa a receber código aleatório no email pelo EmailJS normal. Defina no `.env` e gere o config antes de usar.

## 5. GitHub Pages (hospedagem atual)
O Pages serve o branch como está e não tem ambiente de build: se levar o site para o Pages, gere o `config.js` localmente e envie com `git add -f config.js` (aceitando que ele ficará visível no repositório — só nele), ou migre para um host com variáveis de ambiente (Netlify/Vercel) mantendo a chave publishable.
