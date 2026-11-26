Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get("MP_WEBHOOK_SECRET");
    const url = new URL(req.url);
    const dataId = url.searchParams.get("data.id") || url.searchParams.get("id");
    const signature = req.headers.get("x-signature") || "";
    if (secret && dataId && signature) {
      const parts = Object.fromEntries(signature.split(",").map(p => p.split("=").map(s => s.trim())));
      const ts = parts["ts"], v1 = parts["v1"];
      if (ts && v1) {
        const manifest = "id:" + dataId + ";request-id:" + (req.headers.get("x-request-id") || "") + ";ts:" + ts + ";";
        const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
        const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, "0")).join("");
        if (hex !== v1) return new Response("assinatura invalida", { status: 401 });
      }
    }
    let paymentId = dataId;
    const body = await req.json().catch(() => ({}));
    if (body && body.data && body.data.id) paymentId = String(body.data.id);
    if (paymentId) {
      const token = Deno.env.get("MP_ACCESS_TOKEN");
      const pr = await fetch("https://api.mercadopago.com/v1/payments/" + paymentId, { headers: { Authorization: "Bearer " + token } });
      if (pr.ok) {
        const pay = await pr.json();
        if (pay.status === "approved" && pay.external_reference) {
          const baseUrl = "https://dumvvprvafzmzqdrenyn.supabase.co";
          const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
          if (srk) {
            await fetch(baseUrl + "/rest/v1/tickets?codigo=eq." + encodeURIComponent(pay.external_reference), {
              method: "PATCH",
              headers: { apikey: srk, Authorization: "Bearer " + srk, "Content-Type": "application/json", Prefer: "return=minimal" },
              body: JSON.stringify({ etapa: 2, status_texto: "Pagamento aprovado - Custodia Segura" })
            });
          }
        }
      }
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ received: true, erro: String(e) }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
});
