// @ts-check
import express from "express";
import { body, validationResult } from "express-validator";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

import { User } from "../models/users.js";

var router = express.Router();

router.post(
  "/webauthn/authenticate/finish",
  [
    body("email")
      .isEmail()
      .withMessage("A valid 'email' must be provided with this request"),
    body("authenticationResponse")
      .not()
      .isEmpty()
      .isObject()
      .withMessage(
        "A non empty 'authenticationResponse' must be provided with this request"
      ),
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
      var expectedChallenge = "";

      var user = await User.findOne({ email });

      if (!user) {
        return res.sendStatus(422);
      }

      /**
       * @type {import('@simplewebauthn/types').AuthenticatorDevice}
       */
      var authenticatorForCredentials = user.devices.find(
        ({ credentialID }) => credentialID === authenticationResponse.id
      );

      if (!authenticatorForCredentials) {
        return res.sendStatus(422);
      }

      var verification;

      try {
        verification = await verifyAuthenticationResponse({
          response: authenticationResponse,
          expectedChallenge: `${expectedChallenge}`,
          expectedOrigin: "localhost",
          expectedRPID: "localhost",
          authenticator: authenticatorForCredentials,
          requireUserVerification: false,
        });
      } catch (error) {}

      if (!verification) {
        return res.sendStatus(422);
      }

      var { verified, authenticationInfo } = verification;

      if (verified) {
        authenticatorForCredentials.counter = authenticationInfo.newCounter;
      }

      /**
       * TODO: Remove challenge from Redis
       */

      /**
       * TODO: Generate access and refresh tokens
       */

      res.status(200);
    } catch (err) {
      next(err);
    }
  }
);

export { router as webauthnRegisterStart };
