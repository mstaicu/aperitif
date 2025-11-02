// @ts-check
import { jetstream } from "@nats-io/jetstream";
import { importPKCS8, SignJWT } from "jose";
import nconf from "nconf";
import { readFile } from "node:fs/promises";

var ES256_PRIVATE_KEY = await importPKCS8(
  await readFile(nconf.get("JWT_PRIVATE_KEY_PATH"), "utf8"),
  "ES256",
);

/**
 * @param {import("mongoose").Connection} mc
 * @param {import("@nats-io/transport-node").NatsConnection} nc
 */
export var postMagicLink = (mc, nc) => {
  var { MagicLink, User } = mc.models;

  /**
   * @type {import("express").RequestHandler}
   */
  var handler = async (req, res) => {
    var { email } = req.body;

    if (!email) return res.sendStatus(400);

    var user = await User.findOne({ email });

    if (!user) {
      var ml = new MagicLink({ email });
      await ml.save();

      try {
        await jetstream(nc).publish(
          "auth.magic_link.created",
          JSON.stringify({
            email,
            token: ml._id,
          }),
        );
      } catch {
        await ml.deleteOne();
      }

      // DEBUG
      res.status(200).send({
        token: ml._id,
      });
    }

    res.status(200);
  };

  return {
    handlers: [handler],
    method: "post",
    openapi: {
      description:
        "Creates or re-sends a magic link token for the supplied email address.",
      responses: {
        200: {
          description: "Magic link issued successfully.",
        },
        204: { description: "User already exists; no new magic link issued." },
        400: {
          description: "Request body missing required fields or invalid.",
        },
      },
      summary: "Request magic link",
      tags: ["magic"],
    },
    path: "/register/magic-link",
  };
};

/**
 * @param {import("mongoose").Connection} mc
 */
export var postMagicLinkVerification = (mc) => {
  var { MagicLink, User } = mc.models;

  /**
   * @type {import("express").RequestHandler}
   */
  var handler = async (req, res) => {
    var { token } = req.body;

    var ml = await MagicLink.findOneAndUpdate(
      { _id: token, used: false },
      { $set: { used: true } },
    );
    if (!ml) return res.sendStatus(400);

    if (await User.findOne({ email: ml.email })) return res.sendStatus(400);

    var user = new User({ email: ml.email });
    await user.save();

    var { hostname, origin } = new URL(nconf.get("ORIGIN"));

    var jwt = new SignJWT({
      email: user.email,
      sub: user._id,
      // TODO: Restrict this to webauth registration routes
    })
      .setProtectedHeader({ alg: "ES256", kid: "jwk-1" })
      .setIssuedAt()
      .setExpirationTime("1000m")
      .setAudience(hostname)
      .setIssuer(origin);

    res.status(200).json({
      token: await jwt.sign(ES256_PRIVATE_KEY),
    });
  };

  return {
    handlers: [handler],
    method: "post",
    openapi: {
      description:
        "Consumes a magic link token and issues a short-lived registration JWT.",
      responses: {
        200: {
          description: "Magic link verified and registration JWT issued.",
        },
        400: { description: "Token is missing, already used, or invalid." },
        409: { description: "A user for this email already exists." },
        503: { description: "Required dependencies unavailable; retry later." },
      },
      summary: "Verify magic link",
      tags: ["magic"],
    },
    path: "/register/verify-magic-link",
  };
};
