import { jwtVerify } from "jose";

import { createError } from "../problem-details.mjs";

/**
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 */

/**
 * @param {{ authorization?: string, jwks: Jwks }} args
 */
export const authenticate = async ({ authorization, jwks }) => {
  const payload = await verifyAccessToken({ authorization, jwks });
  return payload.sub;
};

/**
 * @param {{ authorization?: string, jwks: Jwks }} args
 * @returns {Promise<import("jose").JWTPayload & { operator?: unknown, sub: string }>}
 */
export const verifyAccessToken = async ({ authorization, jwks }) => {
  const [type, token] = (authorization || "").split(" ");

  if (type !== "Bearer" || !token) {
    throw createError("INVALID_ACCESS_TOKEN");
  }

  try {
    const { payload } = await jwtVerify(token, jwks);

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
