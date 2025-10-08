import { importSPKI, jwtVerify } from "jose";
import nconf from "nconf";
import { readFile } from "node:fs/promises";

var PUBLIC_KEY = await importSPKI(
  await readFile(nconf.get("JWT_PUBLIC_KEY_PATH"), "utf-8"),
  "ES256",
);

/**
 * Express middleware for Bearer Auth JWT validation.
 *
 * @param {AuthedRequest} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export async function requireBearerAuth(req, res, next) {
  var header = req.headers.authorization;

  if (!header) return res.sendStatus(401);

  var [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) return res.sendStatus(401);

  var payload;

  try {
    var result = await jwtVerify(token, PUBLIC_KEY, {
      algorithms: ["ES256"],
    });

    payload = result.payload;
  } catch {
    return res.sendStatus(401);
  }

  if (!payload.sub) return res.sendStatus(401);

  req.user = payload;

  return next();
}
