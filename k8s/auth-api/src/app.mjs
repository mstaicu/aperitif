// @ts-check
import express from "express";
import nconf from "nconf";

import { getHealthzRoute, getReadyzRoute } from "./routes/health.mjs";
import { getJwksRoute } from "./routes/jwks.mjs";
import {
  postMagicLink,
  postMagicLinkVerification,
} from "./routes/register.mjs";

/**
 * @param {import("mongoose").Connection} mc
 * @param {import("@nats-io/transport-node").NatsConnection} nc
 */
export var createApp = (mc, nc) => {
  var app = express();
  app.disable("x-powered-by");

  app.use(express.json());

  var paths = {};

  [getHealthzRoute, getReadyzRoute].forEach((factory) => {
    var route = factory(mc, nc);

    // @ts-ignore
    app[route.method](route.path, ...route.handlers);

    if (route.openapi) {
      // @ts-ignore
      paths[route.path] ??= {};
      // @ts-ignore
      paths[route.path][route.method] = route.openapi;
    }
  });

  app.use((_, res, next) =>
    mc.readyState !== 1 || nc.isClosed() ? res.sendStatus(503) : next(),
  );

  [getJwksRoute, postMagicLink, postMagicLinkVerification].forEach(
    (factory) => {
      var route = factory(mc, nc);

      // @ts-ignore
      app[route.method](route.path, ...route.handlers);

      if (route.openapi) {
        // @ts-ignore
        paths[route.path] ??= {};
        // @ts-ignore
        paths[route.path][route.method] = route.openapi;
      }
    },
  );

  app.get("/openapi.json", (_req, res) =>
    res.json({
      info: {
        description: "auth-api description",
        title: "auth-api",
        version: "1.0.0",
      },
      openapi: "3.0.3",
      paths,
      servers: [
        {
          url: `${nconf.get("ORIGIN")}/api/v1/auth/`,
        },
      ],
      tags: [
        {
          description: "k8s probes",
          name: "health",
        },
        {
          description: "jwks related",
          name: "security",
        },
      ],
    }),
  );

  return app;
};
