// @ts-ignore
import { jetstream } from "@nats-io/jetstream";
import { Router } from "express";
import { importPKCS8, SignJWT } from "jose";
import nconf from "nconf";
import { readFile } from "node:fs/promises";

import { MagicLink, User } from "../models/index.mjs";
import { connect } from "../nats.mjs";

var router = Router();
var nc = await connect();

var ES256_PRIVATE_KEY = await importPKCS8(
  await readFile(nconf.get("JWT_PRIVATE_KEY_PATH"), "utf8"),
  "ES256",
);

router.post("/register/magic-link", async (req, res) => {
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
  }

  res.status(200).send({
    token: ml._id,
  });
});

router.post("/register/verify-magic-link", async (req, res) => {
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
});

export { router as registerRouter };
