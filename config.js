// config.js público — copia inline dos valores públicos usados como fallback no index.html.
// Segredos (CODIGO_ADMIN_FIXO, ADMIN_SENHA_DIRETA) ficam FORA deste arquivo: preencha só num config.js local (gitignored).
window.CONFIG = {
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
    CODIGO_ADMIN_FIXO: "",
    ADMIN_SENHA_DIRETA: ""
};
