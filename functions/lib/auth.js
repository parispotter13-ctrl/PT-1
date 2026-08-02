import { verifyToken } from "@clerk/backend";

const SITE_ORIGIN = "https://pt-1.pages.dev";

export async function getSignedInUserId(request, env) {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Missing sign-in token");
  }

  const token = authorization.slice(7);

  const verifiedToken = await verifyToken(token, {
    secretKey: env.CLERK_SECRET_KEY,
    authorizedParties: [SITE_ORIGIN],
  });

  if (!verifiedToken?.sub) {
    throw new Error("Invalid sign-in token");
  }

  return verifiedToken.sub;
}
