import { createLocalJWKSet, jwtVerify } from "jose";

/**
 * @param {{
 *   authorization?: string,
 *   jwks: import("jose").JSONWebKeySet,
 * }} args
 * @returns {Promise<import("jose").JWTPayload & {
 *   operator?: unknown,
 *   sub: string,
 * }>}
 */
export const verifyAccessToken = async ({ authorization, jwks }) => {
  const [type, token] = (authorization || "").split(" ");

  if (type !== "Bearer" || !token) {
    throw new Error("INVALID_ACCESS_TOKEN");
  }

  try {
    const { payload } = await jwtVerify(token, createLocalJWKSet(jwks));

    if (typeof payload.sub !== "string") {
      throw new Error("INVALID_ACCESS_TOKEN");
    }

    return {
      ...payload,
      sub: payload.sub,
    };
  } catch {
    throw new Error("INVALID_ACCESS_TOKEN");
  }
};

/**
 * @param {{
 *   authorization?: string,
 *   jwks: import("jose").JSONWebKeySet,
 * }} args
 */
export const authenticateOperator = async ({ authorization, jwks }) => {
  const payload = await verifyAccessToken({
    authorization,
    jwks,
  });

  if (payload.operator !== true) {
    throw new Error("FORBIDDEN");
  }

  return payload.sub;
};
