function hex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;

  let result = 0;

  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}

async function verifyStripeSignature(request, body, secret) {
  const signatureHeader = request.headers.get("Stripe-Signature");

  if (!signatureHeader) return false;

  const values = Object.fromEntries(
    signatureHeader.split(",").map((part) => part.split("="))
  );

  if (!values.t || !values.v1) return false;

  const signedPayload = `${values.t}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );

  return safeEqual(hex(signature), values.v1);
}

export async function onRequestPost({ request, env }) {
  const body = await request.text();

  const valid = await verifyStripeSignature(
    request,
    body,
    env.STRIPE_WEBHOOK_SECRET
  );

  if (!valid) {
    return new Response("Invalid Stripe signature", { status: 400 });
  }

  const event = JSON.parse(body);
  const session = event.data?.object;

  if (event.type === "checkout.session.completed") {
    const clerkUserId =
      session.metadata?.clerk_user_id || session.client_reference_id;

    if (clerkUserId) {
      await env.DB.prepare(
        `INSERT OR REPLACE INTO orders
          (id, member_id, stripe_customer_id, stripe_session_id, programme, status, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          `order_${session.id}`,
          clerkUserId,
          session.customer || null,
          session.id,
          "Foundation",
          session.payment_status === "paid" ? "paid" : "pending",
          session.amount_total || 0
        )
        .run();
    }
  }

  if (event.type === "invoice.paid") {
    const clerkUserId = session.subscription_details?.metadata?.clerk_user_id;

    if (clerkUserId) {
      await env.DB.prepare(
        `UPDATE orders
         SET status = 'paid'
         WHERE member_id = ? AND stripe_customer_id = ?`
      )
        .bind(clerkUserId, session.customer)
        .run();
    }
  }

  if (event.type === "invoice.payment_failed") {
    await env.DB.prepare(
      `UPDATE orders
       SET status = 'payment_failed'
       WHERE stripe_customer_id = ?`
    )
      .bind(session.customer)
      .run();
  }

  if (event.type === "customer.subscription.deleted") {
    await env.DB.prepare(
      `UPDATE orders
       SET status = 'cancelled'
       WHERE stripe_customer_id = ?`
    )
      .bind(session.customer)
      .run();
  }

  return new Response("OK", { status: 200 });
}
