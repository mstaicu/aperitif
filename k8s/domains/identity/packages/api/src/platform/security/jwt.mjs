import { jwtVerify } from "jose";

/**
 * @param {{
 *   audience: string,
 *   authorization?: string,
 *   publicKey: import("jose").CryptoKey,
 * }} args
 * @returns {Promise<import("jose").JWTPayload & {
 *   operator?: unknown,
 *   sub: string,
 * }>}
 */
export const verifyAccessToken = async ({
  audience,
  authorization,
  publicKey,
}) => {
  const [type, token] = (authorization || "").split(" ");

  if (type !== "Bearer" || !token) {
    throw new Error("INVALID_ACCESS_TOKEN");
  }

  try {
    const { payload } = await jwtVerify(token, publicKey, { audience });

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
 *   audience: string,
 *   authorization?: string,
 *   publicKey: import("jose").CryptoKey,
 * }} args
 */
export const authenticateOperator = async ({
  audience,
  authorization,
  publicKey,
}) => {
  const payload = await verifyAccessToken({
    audience,
    authorization,
    publicKey,
  });

  if (payload.operator !== true) {
    throw new Error("FORBIDDEN");
  }

  return payload.sub;
};
