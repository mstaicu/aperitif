import { jwtVerify } from "jose";

/**
 * @param {{
 *   audience: string,
 *   authorization?: string,
 *   publicKey: import("jose").CryptoKey,
 * }} args
 * @returns {Promise<import("jose").JWTPayload & {
 *   operator_permissions?: unknown,
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
 *   permission: string,
 *   publicKey: import("jose").CryptoKey,
 * }} args
 */
export const authenticateOperatorPermission = async ({
  audience,
  authorization,
  permission,
  publicKey,
}) => {
  const payload = await verifyAccessToken({
    audience,
    authorization,
    publicKey,
  });

  if (
    !Array.isArray(payload.operator_permissions) ||
    !payload.operator_permissions.includes(permission)
  ) {
    throw new Error("FORBIDDEN");
  }

  return payload.sub;
};
