const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { ticketId, items, valor } = await req.json();
    if (!ticketId || !valor) {
      return Response.json({ error: "ticketId e valor sao obrigatorios" }, { status: 400, headers: cors });
    }
    const token = Deno.env.get("MP_ACCESS_TOKEN");
    if (!token) {
      return Response.json({ error: "MP_ACCESS_TOKEN nao configurado nos secrets da funcao" }, { status: 500, headers: cors });
    }
    const itens = Array.isArray(items) && items.length && items[0].unit_price
      ? items
      : [{ title: "MARKTPLACE stand2", quantity: 1, unit_price: Number(valor), currency_id: "BRL" }];
    const siteUrl = "https://globalinventorystore.github.io/Standoff-cat-logo-/";
    const pref = {
      items: itens,
      external_reference: String(ticketId),
      back_urls: { success: siteUrl, failure: siteUrl, pending: siteUrl },
      notification_url: "https://dumvvprvafzmzqdrenyn.supabase.co/functions/v1/webhook-mercadopago"
    };
    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(pref)
    });
    const data = await r.json();
    if (!r.ok) {
      return Response.json({ error: data.message || data.error || "erro Mercado Pago", detalhe: data }, { status: 500, headers: cors });
    }
    return Response.json({ id: data.id, init_point: data.init_point, qr_code_base64: data.qr_code_base64 || null }, { headers: cors });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500, headers: cors });
  }
});
