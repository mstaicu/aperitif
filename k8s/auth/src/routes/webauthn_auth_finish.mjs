// @ts-check
import express from "express";
import { body, validationResult } from "express-validator";
import nconf from "nconf";

import { verifyAuthenticationResponse } from "@simplewebauthn/server";

import { User } from "../models/users.mjs";
import { redis } from "../utils/redis/index.mjs";

var router = express.Router();

router.post(
  "/webauthn/authenticate/finish",
  [
    body("email").isEmail().withMessage("'email' must be provided"),
    body("authenticationResponse")
      .not()
      .isEmpty()
      .isObject()
      .withMessage("'authenticationResponse' must be provided"),
  ],
  /**
   *
   * @param {express.Request} req
   * @param {express.Response} res
   * @param {express.NextFunction} next
   */
  async (req, res, next) => {
    try {
      var errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          type: "https://example.com/probs/validation-error",
          title: "Invalid Request",
          status: 400,
          detail: "There were validation errors with your request",
          errors: errors.array(),
        });
      }

      /**
       * @type {{
       *  authenticationResponse: import('@simplewebauthn/types').AuthenticationResponseJSON
       *  email: String
       * }}
       */
      var { email, authenticationResponse } = req.body;

      var user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({
          type: "https://example.com/probs/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Invalid or missing authorization",
        });
      }

      /**
       * @type {import('@simplewebauthn/types').AuthenticatorDevice}
       */
      var authenticator = user.devices.find(
        ({ credentialID }) => credentialID === authenticationResponse.id
      );

      if (!authenticator) {
        return res.status(401).json({
          type: "https://example.com/probs/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Authenticator device not found",
        });
      }

      var challengeKey = `webauthnChallenge:authenticate:${email}`;
      var expectedChallenge;

      try {
        expectedChallenge = await redis.get(challengeKey);
      } catch (err) {}

      if (!expectedChallenge) {
        return res.status(401).json({
          type: "https://example.com/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Challenge expired or not found",
        });
      }

      /**
       * @type {import("@simplewebauthn/server").VerifiedAuthenticationResponse}
       */
      var verification;

      try {
        verification = await verifyAuthenticationResponse({
          response: authenticationResponse,
          expectedChallenge: `${expectedChallenge}`,
          expectedOrigin: nconf.get("ORIGIN"),
          expectedRPID: nconf.get("DOMAIN"),
          authenticator,
          requireUserVerification: false,
        });
      } catch (error) {
        return res.status(401).json({
          type: "https://example.com/probs/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Authentication verification failed",
        });
      }

      var { verified, authenticationInfo } = verification;

      if (!verified) {
        return res.status(401).json({
          type: "https://example.com/probs/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Authentication failed",
        });
      }

      authenticator.counter = authenticationInfo.newCounter;

      await user.save();

      await redis.del(challengeKey);

      /**
       * TODO: Generate access and refresh tokens based on subscription status
       */

      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }
);

export { router as webauthnAuthFinish };
