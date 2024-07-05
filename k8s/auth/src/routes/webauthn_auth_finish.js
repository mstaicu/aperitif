// @ts-check
import express from "express";
import { body, validationResult } from "express-validator";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

import { User } from "../models/users.js";

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
        return res.status(400).json({ errors: errors.array() });
      }

      /**
       * @type {{
       *  authenticationResponse: import('@simplewebauthn/types').AuthenticationResponseJSON
       *  email: String
       * }}
       */
      var { email, authenticationResponse } = req.body;

      /**
       * TODO: Retrieve the expected challenge from Redis
       */
      // var challengeKey = `webauthnChallenge:authenticate:${email}`;
      // var expectedChallenge = await redisClient.get(challengeKey);
      // if (!expectedChallenge) {
      //   return res.sendStatus(401)
      // }
      var expectedChallenge = "";

      var user = await User.findOne({ email });

      /**
       * TODO: Email enumeration attacks
       */
      if (!user) {
        return res.sendStatus(422);
      }

      /**
       * @type {import('@simplewebauthn/types').AuthenticatorDevice}
       */
      var authenticator = user.devices.find(
        ({ credentialID }) => credentialID === authenticationResponse.id
      );

      if (!authenticator) {
        return res.sendStatus(422);
      }

      /**
       * @type {import("@simplewebauthn/server").VerifiedAuthenticationResponse | undefined}
       */
      var verification;

      try {
        verification = await verifyAuthenticationResponse({
          response: authenticationResponse,
          expectedChallenge: `${expectedChallenge}`,
          expectedOrigin: "localhost",
          expectedRPID: "localhost",
          authenticator,
          requireUserVerification: false,
        });
      } catch (error) {}

      if (!verification) {
        return res.sendStatus(401);
      }

      var { verified, authenticationInfo } = verification;

      if (verified) {
        authenticator.counter = authenticationInfo.newCounter;

        await user.save();

        /**
         * TODO: Remove challenge from Redis
         */
        // await redisClient.del(challengeKey);
      }

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
