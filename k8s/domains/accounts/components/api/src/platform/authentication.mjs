import { jwtVerify } from "jose";

/**
 * @param {{
 *   authorization?: string,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }} args
 * @returns {Promise<string>}
 */
export async function authenticate({ authorization, jwks }) {
  const [type, token] = (authorization ?? "").split(" ");

  if (type !== "Bearer" || !token) {
    throw new Error("INVALID_ACCESS_TOKEN");
  }

  let payload;

  try {
    ({ payload } = await jwtVerify(token, jwks));
  } catch {
    throw new Error("INVALID_ACCESS_TOKEN");
  }

  if (typeof payload.sub !== "string") {
    throw new Error("INVALID_ACCESS_TOKEN");
  }

  return payload.sub;
}
