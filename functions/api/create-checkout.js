const FOUNDATION_PRICE_ID = "price_1Tzk6tRrX97v4geNf2BixqZJ";
const CLERK_ISSUER = "https://hot-eft-0.clerk.accounts.dev";
const SITE_ORIGIN = "https://pt-1.pages.dev";

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);

  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function parseJwt(token) {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid token");
  }

  return {
    header: JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]))),
    payload: JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]))),
    signedData: new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    signature: decodeBase64Url(parts[2]),
  };
}

async function verifyClerkToken(token) {
  const { header, payload, signedData, signature } = parseJwt(token);

  if (
    !payload.sub ||
    payload.iss !== CLERK_ISSUER ||
    !payload.exp ||
    payload.exp * 1000 < Date.now()
  ) {
    throw new Error("Expired or invalid sign-in");
  }

  const keysResponse = await fetch(`${CLERK_ISSUER}/.well-known/jwks.json`);
  const { keys } = await keysResponse.json();

  const signingKey = keys.find((key) => key.kid === header.kid);

  if (!signingKey) {
    throw new Error("Signing key not found");
  }

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    signingKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    signature,
    signedData
  );

  if (!valid) {
    throw new Error("Invalid sign-in signature");
  }

  return payload;
}

export async function onRequestPost({ request, env }) {
  try {
    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return Response.json({ error: "Please sign in first." }, { status: 401 });
    }

    const token = authorization.slice(7);
    const user = await verifyClerkToken(token);

    const form = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": FOUNDATION_PRICE_ID,
      "line_items[0][quantity]": "1",
      "client_reference_id": user.sub,
      "metadata[clerk_user_id]": user.sub,
      "subscription_data[metadata][clerk_user_id]": user.sub,
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

    if (!stripeResponse.ok) {
      console.error(checkout);
      return Response.json(
        { error: "Unable to create checkout." },
        { status: 500 }
      );
    }

    return Response.json({ url: checkout.url });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Unable to verify your account." },
      { status: 401 }
    );
  }
}
