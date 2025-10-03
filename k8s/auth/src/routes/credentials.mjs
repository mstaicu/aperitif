// @ts-check
import { server } from "@passwordless-id/webauthn";
import { Router } from "express";
import nconf from "nconf";

import { Challenge, Passkey } from "../models/index.mjs";

var router = Router();

router.post("/webauthn/challenge", async (_, res) => {
  var challenge = new Challenge();
  await challenge.save();

  res.status(200).json({
    challenge: challenge.content,
    challengeId: challenge._id,
  });
});

router.post("/webauthn/registration", async (req, res) => {
  var { attestation, challengeId } = req.body;

  if (!attestation || !challengeId) {
    return res.sendStatus(400);
  }

  var challenge = await Challenge.findById(challengeId);

  if (!challenge) {
    return res.sendStatus(400);
  }

  var { origin } = new URL(nconf.get("ORIGIN"));

  var expected = {
    challenge: challenge.content,
    origin,
  };

  var reg;

  try {
    reg = await server.verifyRegistration(attestation, expected);
  } catch {
    await challenge.deleteOne();
    return res.sendStatus(400);
  }

  if (!reg.userVerified) {
    await challenge.deleteOne();
    return res.sendStatus(400);
  }

  var { algorithm, id: credentialId, publicKey } = reg.credential;
  var { counter } = reg.authenticator;
  var { id: userId } = reg.user;

  var userIdBase64Url = Buffer.from(userId).toString("base64url");

  var passkey = new Passkey({
    algorithm,
    counter,
    credentialId,
    publicKey,

    userId: userIdBase64Url,
  });
  await passkey.save();

  await challenge.deleteOne();

  res.sendStatus(201);
});

router.post("/webauthn/authentication", async (req, res) => {
  var { authentication, challengeId } = req.body;

  if (!authentication || !challengeId) {
    return res.sendStatus(400);
  }

  var challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    return res.sendStatus(400);
  }

  var passkey = await Passkey.findOne({ credentialId: authentication.id });

  if (!passkey) {
    await challenge.deleteOne();
    return res.sendStatus(401);
  }

  var { origin } = new URL(nconf.get("ORIGIN"));

  var expected = {
    challenge: challenge.content,
    origin,
    userVerified: true,
  };

  var credential = {
    algorithm: passkey.algorithm,
    id: passkey.credentialId,
    publicKey: passkey.publicKey,
  };

  var result;

  try {
    result = await server.verifyAuthentication(
      authentication,
      // @ts-ignore
      credential,
      expected,
    );
  } catch {
    await challenge.deleteOne();
    return res.sendStatus(401);
  }

  if (!result.userVerified || result.userId !== passkey.userId) {
    await challenge.deleteOne();
    return res.sendStatus(401);
  }

  if (typeof result.counter === "number" && result.counter < passkey.counter) {
    await challenge.deleteOne();
    return res.sendStatus(401);
  }

  passkey.counter = result.counter;
  await passkey.save();

  await challenge.deleteOne();

  res.sendStatus(200);
});

export { router as webauthnRouter };
