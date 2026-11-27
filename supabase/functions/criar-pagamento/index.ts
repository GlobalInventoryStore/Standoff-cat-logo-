const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
};

type Metodo = "pix" | "debito" | "credito";

function arredondar(valor: number) {
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

function precoNumero(valor: unknown) {
  const limpo = String(valor ?? "0").replace(/R\$/gi, "").replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  return arredondar(Number(limpo));
}

function taxaGateway(metodo: Metodo, parcelas: string, base: number) {
  if (metodo === "pix" || metodo === "debito") return 0;
  return arredondar(base * (parcelas === "7-12" ? 0.12 : parcelas === "2-6" ? 0.08 : 0.045));
}

function restricoesPagamento(metodo: Metodo, parcelas: string) {
  if (metodo === "pix") return { payment_methods: { excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "prepaid_card" }], installments: 1 } };
  if (metodo === "debito") return { payment_methods: { excluded_payment_types: [{ id: "credit_card" }, { id: "ticket" }, { id: "bank_transfer" }, { id: "prepaid_card" }], installments: 1 } };
  const maxParcelas = parcelas === "7-12" ? 12 : parcelas === "2-6" ? 6 : 1;
  return { payment_methods: { excluded_payment_types: [{ id: "debit_card" }, { id: "ticket" }, { id: "bank_transfer" }, { id: "prepaid_card" }], installments: maxParcelas, default_installments: 1 } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { reservaId, anuncioIds, metodo: metodoRecebido, parcelas: parcelasRecebidas, comprador, pedidoId } = await req.json();
    const metodo = String(metodoRecebido || "") as Metodo;
    const parcelas = String(parcelasRecebidas || "");
    const ids = Array.isArray(anuncioIds) ? [...new Set(anuncioIds.map((id) => String(id).trim()).filter(Boolean))] : [];
    if (!/^RES-\d{5}$/.test(String(reservaId || "")) || !ids.length || !["pix", "debito", "credito"].includes(metodo)) return Response.json({ error: "Dados de checkout inválidos." }, { status: 400, headers: cors });
    if (metodo === "credito" && !["1", "2-6", "7-12"].includes(parcelas)) return Response.json({ error: "Selecione o parcelamento do cartão." }, { status: 400, headers: cors });

    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const baseUrl = "https://dumvvprvafzmzqdrenyn.supabase.co";
    if (!mpToken || !serviceRole) return Response.json({ error: "Checkout seguro não está configurado." }, { status: 500, headers: cors });

    const restHeaders = { apikey: serviceRole, Authorization: "Bearer " + serviceRole, "Content-Type": "application/json" };
    const contasResp = await fetch(baseUrl + "/rest/v1/contas?select=id,titulo,preco,vendido&id=in.(" + ids.map(encodeURIComponent).join(",") + ")", { headers: restHeaders });
    const contas = contasResp.ok ? await contasResp.json() : [];
    if (!Array.isArray(contas) || contas.length !== ids.length || contas.some((conta) => conta.vendido === true)) return Response.json({ error: "Um ou mais anúncios não estão mais disponíveis." }, { status: 409, headers: cors });
    const base = arredondar(contas.reduce((soma, conta) => soma + precoNumero(conta.preco), 0));
    if (!Number.isFinite(base) || base <= 0) return Response.json({ error: "Não foi possível calcular o valor dos anúncios." }, { status: 400, headers: cors });
    const taxa = taxaGateway(metodo, parcelas, base);
    const total = arredondar(base + taxa);
    const metodoTexto = metodo === "credito" ? "Cartão de Crédito (" + (parcelas === "7-12" ? "7–12×" : parcelas === "2-6" ? "2–6×" : "1×") + ")" : metodo === "debito" ? "Cartão de Débito" : "PIX";
    const itensTexto = contas.map((conta) => String(conta.titulo || "Conta Standoff 2")).join(", ");

    const prefResp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: "Bearer " + mpToken, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: "Pedido MARKTPLACE stand2", quantity: 1, unit_price: total, currency_id: "BRL" }],
        external_reference: String(reservaId),
        back_urls: { success: "https://nexustrade.party/", failure: "https://nexustrade.party/", pending: "https://nexustrade.party/" },
        notification_url: baseUrl + "/functions/v1/webhook-mercadopago",
        ...restricoesPagamento(metodo, parcelas)
      })
    });
    const pref = await prefResp.json();
    if (!prefResp.ok || !pref.init_point) return Response.json({ error: pref.message || pref.error || "Não foi possível criar o checkout." }, { status: 502, headers: cors });

    // RES é interna: TICK e vendido=true só existem depois do webhook approved.
    const reservaResp = await fetch(baseUrl + "/rest/v1/tickets", {
      method: "POST",
      headers: { ...restHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({
        codigo: String(reservaId),
        comprador_email: String(comprador?.email || "").slice(0, 255).toLowerCase(),
        comprador_nome: String(comprador?.nome || "Visitante").slice(0, 120),
        comprador_whatsapp: String(comprador?.whatsapp || "").slice(0, 80),
        itens: itensTexto.slice(0, 2000),
        valor_total: "R$ " + total.toFixed(2).replace(".", ","),
        metodo_pagamento: metodoTexto,
        etapa: 1,
        status_texto: "Reserva aguardando pagamento via Mercado Pago",
        concluido: false,
        anuncio_ids: ids.join(",")
      })
    });
    if (!reservaResp.ok) return Response.json({ error: "Não foi possível registrar a tentativa de pagamento." }, { status: 502, headers: cors });
    return Response.json({ id: pref.id, init_point: pref.init_point, total, base, taxa, pedidoId: String(pedidoId || "") }, { headers: cors });
  } catch (_e) {
    return Response.json({ error: "Falha ao iniciar o checkout seguro." }, { status: 500, headers: cors });
  }
});
