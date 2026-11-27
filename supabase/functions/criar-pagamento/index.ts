const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
};

// Travamento por método: o comprador não troca a forma de pagamento dentro do checkout do MP,
// e o valor total já vem fechado do site (itens somam exatamente o total calculado).
function restricoesPagamento(metodo, parcelas) {
  const m = String(metodo || "pix");
  if (m === "pix") {
    return {
      payment_methods: {
        excluded_payment_types: [
          { id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "prepaid_card" }
        ],
        installments: 1
      }
    };
  }
  if (m === "debito") {
    return {
      payment_methods: {
        excluded_payment_types: [
          { id: "credit_card" }, { id: "ticket" }, { id: "bank_transfer" }, { id: "prepaid_card" }
        ],
        installments: 1
      }
    };
  }
  // credito: só cartão de crédito, limite de parcelas pela faixa escolhida no site
  const maxParcelas = String(parcelas) === "7-12" ? 12 : (String(parcelas) === "2-6" ? 6 : 1);
  return {
    payment_methods: {
      excluded_payment_types: [
        { id: "debit_card" }, { id: "ticket" }, { id: "bank_transfer" }, { id: "prepaid_card" }
      ],
      installments: maxParcelas,
      default_installments: 1
    }
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { ticketId, items, valor, metodo, parcelas } = await req.json();
    if (!ticketId || !valor) {
      return Response.json({ error: "ticketId e valor sao obrigatorios" }, { status: 400, headers: cors });
    }
    const token = Deno.env.get("MP_ACCESS_TOKEN");
    if (!token) {
      return Response.json({ error: "MP_ACCESS_TOKEN nao configurado nos secrets da funcao" }, { status: 500, headers: cors });
    }
    // Valor total bloqueado: os itens somam exatamente o total calculado no site.
    const itens = Array.isArray(items) && items.length && items[0].unit_price
      ? items
      : [{ title: "MARKTPLACE stand2", quantity: 1, unit_price: Number(valor), currency_id: "BRL" }];
    const siteUrl = "https://nexustrade.party/";
    const pref = {
      items: itens,
      external_reference: String(ticketId),
      back_urls: { success: siteUrl, failure: siteUrl, pending: siteUrl },
      notification_url: "https://dumvvprvafzmzqdrenyn.supabase.co/functions/v1/webhook-mercadopago",
      ...restricoesPagamento(metodo, parcelas)
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
