// @ts-check
import express from "express";
import { header, validationResult } from "express-validator";
import { verify } from "jsonwebtoken";
import nconf from "nconf";

import { generateRegistrationOptions } from "@simplewebauthn/server";

import { User } from "../models/users.js";
import { redis } from "../utils/redis/index.mjs";

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
        return res.status(400).json({
          type: "https://example.com/probs/validation-error",
          title: "Invalid Request",
          status: 400,
          detail: "There were validation errors with your request",
          errors: errors.array(),
        });
      }

      var header = req.headers.authorization || "";
      var [type, token] = header.split(" ");

      if (type !== "Bearer" || !token) {
        return res.status(401).json({
          type: "https://example.com/probs/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Invalid or missing authorization token",
        });
      }

      var tokenPayload;

      try {
        tokenPayload = verify(token, nconf.get("LOGIN_ACCESS_TOKEN"));
      } catch (error) {
        return res.status(401).json({
          type: "https://example.com/probs/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Invalid or expired authorization token",
        });
      }

      if (
        !tokenPayload ||
        typeof tokenPayload === "string" ||
        !tokenPayload.email
      ) {
        return res.status(401).json({
          type: "https://example.com/probs/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Invalid token payload",
        });
      }

      var user = await User.findOne({ email: tokenPayload.email });

      /**
       * Email Enumeration: If the route reveals whether an email exists in the system,
       * it can be used for enumeration attacks.
       *
       * Return the same options response regardless of the existence of the user
       */

      /**
       * @type {import("@simplewebauthn/server").GenerateRegistrationOptionsOpts}
       */
      var options = {
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
      };

      var registrationOptions = await generateRegistrationOptions(options);

      if (user) {
        var expectedChallenge = registrationOptions.challenge;

        redis.setex(
          `webauthnChallenge:register:${user.email}`,
          300,
          expectedChallenge
        );
      }

      res.status(200).json({
        registrationOptions,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as webauthnRegisterStart };
