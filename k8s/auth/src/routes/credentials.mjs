// @ts-check
import { server } from "@passwordless-id/webauthn";
import { Router } from "express";

import { Challenge, Passkey, User } from "../models/index.mjs";

var router = Router();

router.post("/challenge", async (_, res) => {
  const challenge = new Challenge();
  await challenge.save();

  res.status(200).json({
    challenge: challenge.content,
    challengeId: challenge._id,
  });
});

router.post("/", async (req, res) => {
  const { attestation, challengeId } = req.body;

  const challenge = await Challenge.findById(challengeId);

  if (!challenge) {
    return res.status(400).json();
  }

  /**
   * Enforce origin + domain in addition to challenge
   * - origin: must match the full URL origin
   * - domain: must match RP ID (usually your base domain, can cover subdomains)
   */

  const { hostname, origin } = new URL(
    process.env.WEBAUTHN_RP_URL || "https://tma.com",
  );

  const expected = {
    challenge: challenge.content,
    domain: hostname,
    origin,
  };

  const reg = await server.verifyRegistration(attestation, expected);

  if (!reg.userVerified) {
    return res.status(400).json({ error: "User verification failed" });
  }

  const user = new User();
  await user.save();

  var passkey = new Passkey({
    user: user._id,
  });

  await passkey.save();

  res.status(201);
});

export default router;
