//config.js público — copia inline dos valores públicos usados como fallback no index.html.
//Segredos (CODIGO_ADMIN_FIXO, ADMIN_SENHA_DIRETA) ficam FORA deste arquivo: preencha só num config.js local (gitignored).
//Supabase keys (já preenchidas do projeto ativo):
window.CONFIG= {
   SUPABASE_URL: "https://dumvvprvafzmzqdrenyn.supabase.co",
   SUPABASE_PUBLISHABLE_KEY: "sb_publishable_aFCSgScOybPE8uWFVpxpHw_Xm1ov8SQ",
      EMAILJS_SERVICE_ID: "service_cbzumvf",
   EMAILJS_TEMPLATE_ID: "template_2i8efoy",
   EMAILJS_PUBLIC_KEY: "1vj4x8Vvg6VTECZG7",
   ADMIN_WHATSAPP: "5564984156811",
   // Gateway Fase 1 (PIX manual): preencher com a chave real que recebe os pagamentos.
   // Vazio = o site mostra "chave nao configurada" e encaminha ao suporte (nunca gera QR falso).
   PIX_CHAVE: "globalinventorystore@gmail.com",
   PIX_NOME: "MARKTPLACE STAND2",
   PIX_CIDADE: "SAO PAULO",
   // Gateway Fase 2 (Mercado Pago via Supabase Edge Functions).
   // Preencher com as credenciais da conta MP em globalinventorystore@gmail.com.
   // MP_PUBLIC_KEY: chave publica do Mercado Pago (pode ficar no HTML, visível por design).
   // MP_ACCESS_TOKEN: access token do Mercado Pago (obter no painel MP > Dashboard > API Credentials).
   //                          Cuidado: este é um segredo, NUNCA commitar no git público.
   // MP_WEBHOOK_SECRET: segredo do webhook do Mercado Pago (gerado no painel MP ao criar webhook).
   MP_PUBLIC_KEY: "",           // Chave publica MP — pode ser visível no HTML
   MP_ACCESS_TOKEN: "",         // Access token MP — segredo, manter fora do git
   MP_WEBHOOK_SECRET: "",       // Segredo webhook MP — gerar no painel MP
   CODIGO_ADMIN_FIXO: "",
   ADMIN_SENHA_DIRETA: ""
};
