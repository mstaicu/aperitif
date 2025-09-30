// @ts-check
import { server } from "@passwordless-id/webauthn";
import { Router } from "express";
import nconf from "nconf";

import { Challenge, Passkey, User } from "../models/index.mjs";

var router = Router();

router.post("/webauthn/registrations/challenge", async (_, res) => {
  var challenge = new Challenge();
  await challenge.save();

  res.status(200).json({
    challenge: challenge.content,
    challengeId: challenge._id,
  });
});

router.post("/webauthn/registrations", async (req, res) => {
  var { attestation, challengeId } = req.body;

  var challenge = await Challenge.findById(challengeId);

  if (!challenge) {
    return res.status(400).json();
  }

  /**
   * Enforce origin + domain in addition to challenge
   * - origin: must match the full URL origin
   * - domain: must match RP ID (usually your base domain, can cover subdomains)
   */

  var { hostname, origin } = new URL(nconf.get("WEBAUTHN_RP_URL"));

  var expected = {
    challenge: challenge.content,
    domain: hostname,
    origin,
  };

  var reg = await server.verifyRegistration(attestation, expected);

  if (!reg.userVerified) {
    return res.status(400).json({ error: "User verification failed" });
  }

  var user = new User();
  await user.save();

  var passkey = new Passkey({
    user: user._id,
  });

  await passkey.save();

  res.status(201);
});

export { router as webauthnRouter };
