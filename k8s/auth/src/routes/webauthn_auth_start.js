// @ts-check
import express from "express";
import { body, validationResult } from "express-validator";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

import { User } from "../models/users.js";

var router = express.Router();

router.post(
  "/webauthn/authenticate/start",
  [
    body("email")
      .isEmail()
      .withMessage("A valid 'email' must be provided with this request"),
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

      var user = await User.findOne({ email: req.body.email });

      if (!user) {
        return res.sendStatus(422);
      }

      var options = await generateAuthenticationOptions({
        timeout: 60000,
        allowCredentials: user.devices.map((dev) => ({
          id: dev.credentialID,
          type: "public-key",
          transports: dev.transports,
        })),
        /**
         * Wondering why user verification isn't required? See here:
         *
         * https://passkeys.dev/docs/use-cases/bootstrapping/#a-note-about-user-verification
         */
        userVerification: "preferred",
        rpID: "localhost",
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
