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
            const restHeaders = { apikey: srk, Authorization: "Bearer " + srk, "Content-Type": "application/json", Prefer: "return=representation" };
            // Lê o ticket-reserva; só age se ainda estiver aguardando pagamento (idempotente).
            const tr = await fetch(baseUrl + "/rest/v1/tickets?codigo=eq." + encodeURIComponent(String(pay.external_reference)), { headers: { apikey: srk, Authorization: "Bearer " + srk } });
            const rows = tr.ok ? await tr.json().catch(() => []) : [];
            const row = Array.isArray(rows) ? rows[0] : null;
            if (row && !row.concluido && Number(row.etapa) < 2) {
              // A RES é invisível para o comprador. O ticket real só é criado após a
              // confirmação aprovada do Mercado Pago, nunca ao abrir a preferência.
              const codigoReserva = String(pay.external_reference);
              const codigoTicket = codigoReserva.replace(/^RES-/, "TICK-");
              const ids = String(row.anuncio_ids || "").split(",").map(s => s.trim()).filter(Boolean);
              let contasReservadas = true;
              if (ids.length) {
                const contasResp = await fetch(baseUrl + "/rest/v1/contas?vendido=is.false&id=in.(" + ids.map(encodeURIComponent).join(",") + ")", {
                  method: "PATCH",
                  headers: { ...restHeaders, Prefer: "return=representation" },
                  body: JSON.stringify({ vendido: true })
                });
                const contas = contasResp.ok ? await contasResp.json().catch(() => []) : [];
                contasReservadas = Array.isArray(contas) && contas.length === ids.length;
              }
              // Se algum anúncio já foi vendido, não libera um segundo ticket nem avisa
              // venda. O pagamento fica pendente de tratamento manual pelo admin.
              if (!contasReservadas) return new Response(JSON.stringify({ received: true, ignored: "anuncio_indisponivel" }), { status: 200, headers: { "Content-Type": "application/json" } });
              const ticketResp = await fetch(baseUrl + "/rest/v1/tickets?codigo=eq." + encodeURIComponent(codigoReserva), {
                method: "PATCH",
                headers: { ...restHeaders, Prefer: "return=minimal" },
                body: JSON.stringify({ codigo: codigoTicket, etapa: 2, status_texto: "Pagamento aprovado - Custodia Segura" })
              });
              if (!ticketResp.ok) return new Response(JSON.stringify({ received: true, ignored: "reserva_nao_atualizada" }), { status: 200, headers: { "Content-Type": "application/json" } });
              // Aviso de VENDA no WhatsApp (fila lida pelo notifier), exclusivamente após approved.
              const mpPagamento = String(pay.payment_method_id || pay.payment_type_id || "");
              const msg = "VENDA\nTicket: " + codigoTicket +
                "\nMétodo de pagamento: " + (row.metodo_pagamento || mpPagamento) +
                "\nValor: " + (row.valor_total || (pay.transaction_amount != null ? "R$ " + Number(pay.transaction_amount).toFixed(2).replace(".", ",") : "")) +
                "\nComprador: " + (row.comprador_nome || "(sem nome)") + (row.comprador_email ? " (" + row.comprador_email + ")" : "") + (row.comprador_whatsapp ? ", WhatsApp " + row.comprador_whatsapp : "") +
                "\nItens: " + (row.itens || "(não informado)") +
                "\nStatus: pagamento APROVADO pelo Mercado Pago (confirmação automática)" +
                "\nHora da confirmação: " + new Date().toLocaleString("pt-BR");
              await fetch(baseUrl + "/rest/v1/notificacao", {
                method: "POST",
                headers: { ...restHeaders, Prefer: "return=minimal" },
                body: JSON.stringify({ titulo: "VENDA APROVADA — MARKTPLACE stand2", mensagem: msg.slice(0, 3000) })
              });
            }
          }
        }
      }
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ received: true, erro: String(e) }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
});
