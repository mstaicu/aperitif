import { jwtVerify } from "jose";

/**
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 */

/**
 * @param {{ authorization?: string, jwks: Jwks }} args
 */
export const authenticate = async ({ authorization, jwks }) => {
  const [type, token] = (authorization || "").split(" ");

  if (type !== "Bearer" || !token) {
    throw new Error("INVALID_ACCESS_TOKEN");
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      audience: "spaces",
    });

    if (typeof payload.sub !== "string") {
      throw new Error("INVALID_ACCESS_TOKEN");
    }

    return payload.sub;
  } catch {
    throw new Error("INVALID_ACCESS_TOKEN");
  }
};

/**
 * @param {{ authorization?: string, jwks: Jwks }} args
 */
export const authenticateOptional = async ({ authorization, jwks }) =>
  authorization ? authenticate({ authorization, jwks }) : null;
