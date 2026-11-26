import { createClient } from "@supabase/supabase-js";
import type { ServeFunction } from "@supabase/functions-types";

export const handler: ServeFunction = async (req) => {
  try {
    const payload = req.body();
    const signature = req.header("x-signature");

    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Assinatura x-signature ausente" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Webhook secret should be from env vars in production
    const WEBHOOK_SECRET = "whsec_seu_secreto_aqui";

    // Verify webhook signature
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");

    if (hmac !== signature) {
      return new Response(
        JSON.stringify({ error: "Assinatura inválida" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const event = JSON.parse(payload);

    // Only process payment.updated events
    if (event.type !== "payment.updated") {
      return new Response(
        JSON.stringify({ status: "ignorado", motivo: "evento não é payment.updated" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const payment = event.data;
    const paymentId = payment.id;
    const status = payment.status;

    // Only process approved payments
    if (status !== "approved") {
      return new Response(
        JSON.stringify({ status: "ignorado", motivo: `status ${status} não é approved` }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Here would update the ticket status in Supabase
    // For now, return success
    return new Response(
      JSON.stringify({
        status: "atualizado",
        payment_id: paymentId,
        ticket_etapa: 2,
        mensagem: "Pagamento aprovado - ticket avançou para etapa 2"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro no webhook Mercado Pago:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};