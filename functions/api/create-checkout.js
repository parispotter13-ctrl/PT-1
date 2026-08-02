import { getSignedInUserId } from "../lib/auth.js";

const FOUNDATION_PRICE_ID = "price_1Tzk6tRrX97v4geNf2BixqZJ";
const SITE_ORIGIN = "https://pt-1.pages.dev";

export async function onRequestPost({ request, env }) {
  try {
    const memberId = await getSignedInUserId(request, env);

    const form = new URLSearchParams({
      mode: "subscription",
      phone_number_collection: "true",
      billing_address_collection: "required",

      "line_items[0][price]": FOUNDATION_PRICE_ID,
      "line_items[0][quantity]": "1",

      "client_reference_id": memberId,
      "metadata[clerk_user_id]": memberId,
      "subscription_data[metadata][clerk_user_id]": memberId,

      success_url: `${SITE_ORIGIN}/account/?payment=success`,
      cancel_url: `${SITE_ORIGIN}/#programmes`,
    });

    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      }
    );

    const checkout = await stripeResponse.json();

    if (!stripeResponse.ok || !checkout.url) {
      console.error(checkout);

      return Response.json(
        { error: "Stripe checkout could not be created." },
        { status: 500 }
      );
    }

    return Response.json({ url: checkout.url });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Your sign-in could not be verified." },
      { status: 401 }
    );
  }
}
