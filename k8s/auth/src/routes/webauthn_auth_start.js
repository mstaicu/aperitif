// @ts-check
import express from "express";
import { body, validationResult } from "express-validator";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

import { User } from "../models/users.js";

var router = express.Router();

router.post(
  "/webauthn/authenticate/start",
  [body("email").isEmail().withMessage("'email' must be provided")],
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

      var user = await User.findOne({ email: req.body.email });

      /**
       * Email Enumeration: If the route reveals whether an email exists in the system,
       * it can be used for enumeration attacks.
       *
       * Return the same options response regardless of the existence of the user
       */
      var options = {
        rpID: "localhost",
        timeout: 300000,
        allowCredentials: user
          ? user.devices.map(({ credentialID, transports }) => ({
              id: credentialID,
              type: "public-key",
              transports: transports,
            }))
          : [],
      };

      var authenticationOptions = await generateAuthenticationOptions(options);

      if (user) {
        /**
         * TODO: Store the expected challenge in Redis and retrieve it in the registration verification
         */
        // await redisClient.setex(`webauthnChallenge:authenticate:${user.email}`, 300, authenticationOptions.challenge);
        var expectedChallenge = authenticationOptions.challenge;
      }

      res.status(200).json({
        authenticationOptions,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as webauthnAuthStart };
