// Modelo do config.js — copie para config.js e preencha, ou gere com: node scripts/gerar-config.mjs
// O index.html le window.CONFIG; sem config.js o site continua funcionando com os valores públicos padrão,
// mas o CODIGO_ADMIN_FIXO (segredo) só existe via config.js.
window.CONFIG = {
    SUPABASE_URL: "",
    SUPABASE_PUBLISHABLE_KEY: "",
    EMAILJS_SERVICE_ID: "",
    EMAILJS_TEMPLATE_ID: "",
    EMAILJS_PUBLIC_KEY: "",
    ADMIN_WHATSAPP: "",
    // Gateway Fase 1 - chave PIX publica que recebe os pagamentos (CPF, e-mail, telefone ou aleatoria)
    PIX_CHAVE: "",
    PIX_NOME: "MARKTPLACE STAND2",
    PIX_CIDADE: "SAO PAULO",
    CODIGO_ADMIN_FIXO: "",
    ADMIN_SENHA_DIRETA: ""
};
