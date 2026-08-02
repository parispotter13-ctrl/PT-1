import { onRequestPost as createCheckout } from "../functions/api/create-checkout.js";
import { onRequestPost as stripeWebhook } from "../functions/api/stripe-webhook.js";
import { onRequestGet as getAccount } from "../functions/api/account.js";
import { onRequestGet as getAdminOrders } from "../functions/api/admin-orders.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/create-checkout") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      return createCheckout({ request, env, ctx });
    }

    if (path === "/api/stripe-webhook") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      return stripeWebhook({ request, env, ctx });
    }

    if (path === "/api/account") {
      if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405 });
      }

      return getAccount({ request, env, ctx });
    }

    if (path === "/api/admin-orders") {
      if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405 });
      }

      return getAdminOrders({ request, env, ctx });
    }

    return env.ASSETS.fetch(request);
  },
};
