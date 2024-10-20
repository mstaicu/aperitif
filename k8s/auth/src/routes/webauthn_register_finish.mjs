import { verifyRegistrationResponse } from "@simplewebauthn/server";
// @ts-check
import express from "express";
import { body, header, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import nconf from "nconf";

import { User } from "../models/index.mjs";

var router = express.Router();

router.post(
  "/webauthn/register/finish",
  [
    header("Authorization")
      .not()
      .isEmpty()
      .withMessage("'Authorization' header must be provided"),
    body("registrationResponse")
      .not()
      .isEmpty()
      .isObject()
      .withMessage("'registrationResponse' must be provided"),
  ],
  async (req, res, next) => {
    try {
      var errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          detail: "There were validation errors with your request",
          errors: errors.array(),
          status: 400,
          title: "Invalid Request",
          type: "https://example.com/probs/validation-error",
        });
      }

      var header = req.headers.authorization || "";

      var [type, token] = header.split(" ");

      if (type !== "Bearer" || !token) {
        return res.status(401).json({
          detail: "Invalid or missing authorization token",
          status: 401,
          title: "Unauthorized",
          type: "https://example.com/errors/unauthorized",
        });
      }

      var tokenStatus = await redis.get(`registration:token:${token}`);

      if (!tokenStatus) {
        return res.status(401).json({
          detail: "Token is either expired or has been used already",
          status: 401,
          title: "Unauthorized",
          type: "https://example.com/probs/unauthorized",
        });
      }

      var tokenPayload;

      try {
        tokenPayload = jwt.verify(
          token,
          nconf.get("REGISTRATION_ACCESS_TOKEN"),
        );
      } catch (err) {
        return res.status(401).json({
          detail: "Invalid or expired authorization token",
          status: 401,
          title: "Unauthorized",
          type: "https://example.com/errors/unauthorized",
        });
      }

      if (
        !tokenPayload ||
        typeof tokenPayload === "string" ||
        !tokenPayload.email
      ) {
        return res.status(401).json({
          detail: "Invalid token payload",
          status: 401,
          title: "Unauthorized",
          type: "https://example.com/errors/unauthorized",
        });
      }

      /**
       * @type {import('@simplewebauthn/types').RegistrationResponseJSON}
       */
      var registrationResponse = req.body.registrationResponse;

      /**
       * Challenge
       */
      var challengeKey = `webauthnChallenge:register:${tokenPayload.email}`;

      var expectedChallenge;

      try {
        expectedChallenge = await redis.get(challengeKey);
      } catch (err) {}

      if (!expectedChallenge) {
        return res.status(401).json({
          detail: "Challenge expired or not found",
          status: 401,
          title: "Unauthorized",
          type: "https://example.com/errors/unauthorized",
        });
      }

      /**
       * @type {import('@simplewebauthn/server').VerifiedRegistrationResponse}
       */
      var verifiedRegistrationResponse;

      try {
        verifiedRegistrationResponse = await verifyRegistrationResponse({
          expectedChallenge: `${expectedChallenge}`,
          expectedOrigin: nconf.get("ORIGIN"),
          expectedRPID: nconf.get("DOMAIN"),
          requireUserVerification: false,
          response: registrationResponse,
        });
      } catch (error) {
        return res.status(401).json({
          detail: "Registration verification failed",
          status: 401,
          title: "Unauthorized",
          type: "https://example.com/errors/unauthorized",
        });
      }

      var { registrationInfo, verified } = verifiedRegistrationResponse;

      if (!verified || !registrationInfo) {
        return res.status(401).json({
          detail: "Verification failed",
          status: 401,
          title: "Unauthorized",
          type: "https://example.com/errors/unauthorized",
        });
      }

      var user = await User.findOne({ email: tokenPayload.email });

      if (!user) {
        return res.status(401).json({
          detail: "User not found",
          status: 401,
          title: "Unauthorized",
          type: "https://example.com/errors/unauthorized",
        });
      }

      var { counter, credentialID, credentialPublicKey } = registrationInfo;

      var existingDevice = user.devices.find(
        (device) => device.credentialID === credentialID,
      );

      if (!existingDevice) {
        var newDevice = {
          counter,
          credentialID,
          credentialPublicKey,
          transports: registrationResponse.response.transports,
        };

        user.devices.push(newDevice);

        await user.save();

        try {
          await redis.del(challengeKey);
          await redis.del(`registration_token:${token}`);
        } catch (err) {}
      }

      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  },
);

export { router as webauthnRegisterFinish };
