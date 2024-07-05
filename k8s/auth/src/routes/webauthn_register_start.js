// @ts-check
import express from "express";
import { header, validationResult } from "express-validator";
import { verify } from "jsonwebtoken";
import { generateRegistrationOptions } from "@simplewebauthn/server";

import { User } from "../models/users.js";

var router = express.Router();

router.post(
  "/webauthn/register/start",
  [
    header("Authorization")
      .not()
      .isEmpty()
      .withMessage("'Authorization' header must be provided"),
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

      var header = req.headers.authorization || "";
      var [type, token] = header.split(" ");

      if (type !== "Bearer") {
        return res.sendStatus(401);
      }

      var tokenPayload;

      /**
       * TODO: Store the magic tokens and mark them as 'used' after they were validated?
       * TODO: Add secret to env var
       */
      try {
        tokenPayload = verify(token, "SIGNUP_TOKEN_SECRET");
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

      /**
       * Email Enumeration: If the route reveals whether an email exists in the system,
       * it can be used for enumeration attacks.
       *
       * Return the same options response regardless of the existence of the user
       */
      var options = await generateRegistrationOptions({
        rpName: "localhost",
        rpID: "localhost",
        userName: user ? user.email : "",
        /**
         * Optionals below
         */
        timeout: 300000,
        attestationType: "none",
        excludeCredentials: user
          ? user.devices.map((dev) => ({
              id: dev.credentialID,
              type: "public-key",
              transports: dev.transports,
            }))
          : [],
        /**
         * https://w3c.github.io/webauthn/#dictionary-authenticatorSelection
         */
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
      if (user) {
        var expectedChallenge = options.challenge;
      }

      res.status(200).json({
        options,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as webauthnRegisterStart };
