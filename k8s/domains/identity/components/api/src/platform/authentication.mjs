import { createLocalJWKSet, jwtVerify } from "jose";

/**
 * @param {{
 *   authorization?: string,
 *   jwks: import("./jwt-keys.mjs").JwtKeys["jwks"],
 * }} args
 */
export async function authenticateOperator({ authorization, jwks }) {
  const [type, token] = (authorization ?? "").split(" ");

  if (type !== "Bearer" || !token) {
    throw new Error("INVALID_ACCESS_TOKEN");
  }

  let payload;

  try {
    ({ payload } = await jwtVerify(token, createLocalJWKSet(jwks)));
  } catch {
    throw new Error("INVALID_ACCESS_TOKEN");
  }

  if (typeof payload.sub !== "string") {
    throw new Error("INVALID_ACCESS_TOKEN");
  }

  if (payload.operator !== true) {
    throw new Error("FORBIDDEN");
  }

  return payload.sub;
}
