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
  const stripeObject = event.data?.object;

  if (event.type === "checkout.session.completed") {
    const clerkUserId =
      stripeObject.metadata?.clerk_user_id ||
      stripeObject.client_reference_id;

    if (clerkUserId) {
      const customer = stripeObject.customer_details || {};
      const address = customer.address || {};

      await env.DB.prepare(
        `INSERT INTO members
          (id, email, name, phone, address_line1, address_line2, city, postcode, country)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           email = excluded.email,
           name = excluded.name,
           phone = excluded.phone,
           address_line1 = excluded.address_line1,
           address_line2 = excluded.address_line2,
           city = excluded.city,
           postcode = excluded.postcode,
           country = excluded.country`
      )
        .bind(
          clerkUserId,
          customer.email || `${clerkUserId}@unknown.local`,
          customer.name || null,
          customer.phone || null,
          address.line1 || null,
          address.line2 || null,
          address.city || null,
          address.postal_code || null,
          address.country || null
        )
        .run();

      await env.DB.prepare(
        `INSERT OR REPLACE INTO orders
          (id, member_id, stripe_customer_id, stripe_session_id, programme, status, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          `order_${stripeObject.id}`,
          clerkUserId,
          stripeObject.customer || null,
          stripeObject.id,
          "Foundation",
          stripeObject.payment_status === "paid" ? "paid" : "pending",
          stripeObject.amount_total || 0
        )
        .run();
    }
  }

  if (event.type === "invoice.paid") {
    await env.DB.prepare(
      `UPDATE orders
       SET status = 'paid'
       WHERE stripe_customer_id = ?`
    )
      .bind(stripeObject.customer)
      .run();
  }

  if (event.type === "invoice.payment_failed") {
    await env.DB.prepare(
      `UPDATE orders
       SET status = 'payment_failed'
       WHERE stripe_customer_id = ?`
    )
      .bind(stripeObject.customer)
      .run();
  }

  if (event.type === "customer.subscription.deleted") {
    await env.DB.prepare(
      `UPDATE orders
       SET status = 'cancelled'
       WHERE stripe_customer_id = ?`
    )
      .bind(stripeObject.customer)
      .run();
  }

  return new Response("OK", { status: 200 });
}
