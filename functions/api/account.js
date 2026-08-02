const CLERK_ISSUER = "https://hot-eft-0.clerk.accounts.dev";

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);

  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function getSignedInUserId(request) {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Missing sign-in token");
  }

  const token = authorization.slice(7);
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("Invalid sign-in token");
  }

  const header = JSON.parse(
    new TextDecoder().decode(decodeBase64Url(encodedHeader))
  );

  const payload = JSON.parse(
    new TextDecoder().decode(decodeBase64Url(encodedPayload))
  );

  if (
    !payload.sub ||
    payload.iss !== CLERK_ISSUER ||
    !payload.exp ||
    payload.exp * 1000 < Date.now()
  ) {
    throw new Error("Expired sign-in token");
  }

  const response = await fetch(`${CLERK_ISSUER}/.well-known/jwks.json`);
  const { keys } = await response.json();
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
    decodeBase64Url(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );

  if (!valid) {
    throw new Error("Invalid sign-in signature");
  }

  return payload.sub;
}

export async function onRequestGet({ request, env }) {
  try {
    const memberId = await getSignedInUserId(request, env);

    const orders = await env.DB.prepare(
      `SELECT programme, status, amount, created_at
       FROM orders
       WHERE member_id = ?
       ORDER BY created_at DESC`
    )
      .bind(memberId)
      .all();

    const bookings = await env.DB.prepare(
      `SELECT id, starts_at, status
       FROM bookings
       WHERE member_id = ?
       ORDER BY starts_at ASC`
    )
      .bind(memberId)
      .all();

    return Response.json({
      orders: orders.results || [],
      bookings: bookings.results || [],
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }
}
