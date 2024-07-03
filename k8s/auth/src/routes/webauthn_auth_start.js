// @ts-check
import express from "express";
import { body, validationResult } from "express-validator";
import { verify } from "jsonwebtoken";
import { generateRegistrationOptions } from "@simplewebauthn/server";

import { User } from "../models/users.js";

var router = express.Router();

router.post(
  "/webauthn/authenticate/start",
  [
    body("token")
      .not()
      .isEmpty()
      .isString()
      .withMessage("A valid 'token' must be provided with this request"),
  ],
  /**
   *
   * @param {express.Request} req
   * @param {express.Response} res
   * @param {express.NextFunction} next
   */
  async (req, res, next) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      var { token } = req.body;

      var tokenPayload;

      /**
       * TODO: Store the magic tokens and mark them as 'used' after they were validated?
       * TODO: Add secret to env var
       */
      try {
        tokenPayload = verify(
          decodeURIComponent(token),
          "WEBAUTHN_START_SECRET"
        );
      } catch (error) {
        return res.sendStatus(422);
      }

      if (
        !tokenPayload ||
        typeof tokenPayload === "string" ||
        !tokenPayload.email
      ) {
        return res.sendStatus(422);
      }

      var user = await User.findOne({ email: tokenPayload.email });

      if (!user) {
        return res.sendStatus(422);
      }

      var { devices, email } = user;

      var options = await generateRegistrationOptions({
        rpName: "localhost",
        rpID: "localhost",
        userName: email,
        timeout: 300000, // 5 minutes
        attestationType: "none",
        /**
         * Passing in a user's list of already-registered authenticator IDs here prevents users from
         * registering the same device multiple times. The authenticator will simply throw an error in
         * the browser if it's asked to perform registration when one of these ID's already resides
         * on it.
         */
        excludeCredentials: devices.map((dev) => ({
          id: dev.credentialID,
          type: "public-key",
          transports: dev.transports,
        })),
        authenticatorSelection: {
          residentKey: "discouraged",
          /**
           * Wondering why user verification isn't required? See here:
           *
           * https://passkeys.dev/docs/use-cases/bootstrapping/#a-note-about-user-verification
           */
          userVerification: "preferred",
        },
        /**
         * Support the two most common algorithms: ES256, and RS256
         */
        supportedAlgorithmIDs: [-7, -257],
      });

      /**
       * TODO: Store the expected challenge in Redis and retrieve it in the registration verification
       */
      var expectedChallenge = options.challenge;

      res.status(200).json({ options });
    } catch (err) {
      next(err);
    }
  }
);

export { router as webauthnRegisterStart };
