// Worker Cloudflare: verificação de webhook da Meta (Facebook/Instagram).
// URL de callback no painel da Meta: https://webhook.nexustrade.party/
// Verify token: marktstand2-2026 (mesmo token da Edge Function whatsapp-webhook).
// Deploy: Cloudflare Workers, rota webhook.nexustrade.party/* na zona nexustrade.party.
const VERIFY_TOKEN = "marktstand2-2026";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
        return new Response(challenge, { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }
    if (request.method === "POST") {
      const body = await request.text();
      console.log("webhook-event:", body);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }
    return new Response("Method not allowed", { status: 405 });
  }
};
