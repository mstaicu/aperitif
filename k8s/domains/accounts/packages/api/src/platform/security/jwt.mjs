import { jwtVerify } from "jose";
import nconf from "nconf";

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
    throw new Error("INVALID_ACCESS_TOKEN");
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      audience: nconf.get("ACCESS_TOKEN_AUDIENCE"),
    });

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
