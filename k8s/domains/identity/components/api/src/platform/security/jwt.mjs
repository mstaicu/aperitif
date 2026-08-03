import { createLocalJWKSet, jwtVerify } from "jose";

import { createError } from "../problem-details.mjs";

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
    throw createError("INVALID_ACCESS_TOKEN");
  }

  try {
    const { payload } = await jwtVerify(token, createLocalJWKSet(jwks));

    if (typeof payload.sub !== "string") {
      throw createError("INVALID_ACCESS_TOKEN");
    }

    return {
      ...payload,
      sub: payload.sub,
    };
  } catch {
    throw createError("INVALID_ACCESS_TOKEN");
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
    throw createError("FORBIDDEN");
  }

  return payload.sub;
};
