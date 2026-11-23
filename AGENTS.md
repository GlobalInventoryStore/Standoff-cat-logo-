# Guia de Desenvolvimento - Front-End & Mobile

## 1. Padrões de Layout e Responsividade
- O site deve ser totalmente responsivo, adaptando-se perfeitamente a dispositivos móveis (iOS e Android).
- Nunca utilize posicionamentos absolutos ou fixos incorretos que possam causar sobreposição de elementos no rodapé (footer).
- Utilize CSS Flexbox ou CSS Grid para alinhar o conteúdo de forma limpa.

## 2. Menu Hambúrguer (Mobile)
- O menu hambúrguer deve ser interativo e moderno.
- O ícone do hambúrguer deve se transformar em um "X" animado ao ser aberto.
- O menu lateral deve fechar automaticamente assim que o usuário clicar em qualquer link de navegação ou fora da caixa de opções.

## 3. Qualidade do Código
- Entregar sempre o código integrado (HTML, CSS e JavaScript juntos ou organizados de forma limpa).
- Evitar classes duplicadas ou conflitos de estilo que travem o navegador móvel (como Safari ou Chrome no iOS).

## 4. Regras Supabase (permanentes,MARKTPLACE stand2)
- Toda tabela nova já nasce com `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` e policies: SELECT/INSERT/UPDATE conforme o site precisa; DELETE restrito.
- DELETE permitido somente se `lower(auth.jwt() ->> 'email')` for `globalinventorystore@gmail.com` ou `scruzsamuka@gmail.com` (Supabase Auth). Anônimo e outras contas: sem DELETE.
- Site em tempo real nunca pode quebrar: clientes comuns continuam vendo contas e o fluxo de tickets funcionando.
- Sempre que houver mudança concluída neste projeto, criar commit e enviar (push) ao GitHub no mesmo trabalho; nunca deixar trabalho pronto sem commit+push.
