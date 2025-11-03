import nconf from "nconf";

import { jwksOpenApi } from "../jwks/index.mjs";
import { probesOpenApi } from "../probes/index.mjs";
import { webauthnOpenApi } from "../webauthn/openapi.mjs";

var paths = {};

for (var fragment of [jwksOpenApi, probesOpenApi, webauthnOpenApi]) {
  for (var [path, methods] of Object.entries(fragment)) {
    paths[path] ??= {};
    Object.assign(paths[path], methods);
  }
}

var servers = [
  {
    url: `${nconf.get("ORIGIN")}/api/v1/auth`,
  },
];

/**
 * @returns {import("express").RequestHandler}
 */
export var getOpenApiHandler = () => (_, res) =>
  res.status(200).json({
    info: {
      description: "auth-api description",
      title: "auth-api",
      version: "1.0.0",
    },
    openapi: "3.0.3",
    paths,
    servers,
  });
