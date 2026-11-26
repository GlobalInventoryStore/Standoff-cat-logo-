import { createClient } from "@supabase/supabase-js";
import type { ServeFunction } from "@supabase/functions-types";
import axios from "axios";

export const handler: ServeFunction = async (req) => {
  try {
    const { ticketId, items, valor } = await req.json();

    if (!ticketId || !valor) {
      return new Response(
        JSON.stringify({ error: "ticketId e valor são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Mercado Pago credentials - should be from env vars in production
    // Em produção, use: process.env.MP_PUBLIC_KEY, process.env.MP_ACCESS_TOKEN
    const MP_ACCESS_TOKEN = "APP_USR-5456943033424663-112521-dbb63667ae05ab45e9d6ba7a6641023e";
    const MP_PUBLIC_KEY = "TEST_ACCESS_TOKEN";

    const external_reference = ticketId;
    const itemsArray = items || [{ id: "item", title: "MARKTPLACE stand2", quantity: 1, unit_price: Number(valor) }];

    const preferenceBody = {
      items: itemsArray,
      payer: {
        email: "comprador@exemplo.com"
      },
      back_urls: {
        success: "https://globalinventorystore.github.io/Standoff-cat-logo-/",
        failure: "https://globalinventorystore.github.io/Standoff-cat-logo-/",
        pending: "https://globalinventorystore.github.io/Standoff-cat-logo-/"
      },
      notification_url: "https://globalinventorystore.github.io/Standoff-cat-logo-/webhook-mercadopago",
      external_reference: external_reference,
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [
          {"id": "deferred_credit"},
          {"id": "ticket"}
        ]
      }
    };

    const { data, error } = await axios.post(
      "https://api.mercadopago.com/v1/payments",
      preferenceBody,
      {
        headers: {
          "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return the init_point and QR code info
    const initPoint = data.init_point || data.point_of_interaction?.data.qr_code_url;
    const qrCodeUrl = data.point_of_interaction?.data.qr_code_url;

    return new Response(
      JSON.stringify({
        init_point: initPoint,
        qr_code_url: qrCodeUrl,
        payment_id: data.id,
        sandbox_info: data.sandbox_init_point
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro ao criar pagamento Mercado Pago:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};