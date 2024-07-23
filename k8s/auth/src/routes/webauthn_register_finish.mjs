// @ts-check
import express from "express";
import { header, body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import nconf from "nconf";

import { verifyRegistrationResponse } from "@simplewebauthn/server";

import { User } from "../models/user.mjs";
import { redis } from "../services/index.mjs";

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
          type: "https://example.com/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Invalid or missing authorization token",
        });
      }

      var tokenStatus = await redis.get(`registration:token:${token}`);

      if (!tokenStatus) {
        return res.status(401).json({
          type: "https://example.com/probs/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Token is either expired or has been used already",
        });
      }

      var tokenPayload;

      try {
        tokenPayload = jwt.verify(token, nconf.get("REGISTRATION_ACCESS_TOKEN"));
      } catch (err) {
        return res.status(401).json({
          type: "https://example.com/errors/unauthorized",
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
          type: "https://example.com/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Invalid token payload",
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
          type: "https://example.com/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Challenge expired or not found",
        });
      }

      /**
       * @type {import('@simplewebauthn/server').VerifiedRegistrationResponse}
       */
      var verifiedRegistrationResponse;

      try {
        verifiedRegistrationResponse = await verifyRegistrationResponse({
          response: registrationResponse,
          expectedChallenge: `${expectedChallenge}`,
          expectedOrigin: nconf.get("ORIGIN"),
          expectedRPID: nconf.get("DOMAIN"),
          requireUserVerification: false,
        });
      } catch (error) {
        return res.status(401).json({
          type: "https://example.com/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Registration verification failed",
        });
      }

      var { verified, registrationInfo } = verifiedRegistrationResponse;

      if (!verified || !registrationInfo) {
        return res.status(401).json({
          type: "https://example.com/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Verification failed",
        });
      }

      var user = await User.findOne({ email: tokenPayload.email });

      if (!user) {
        return res.status(401).json({
          type: "https://example.com/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "User not found",
        });
      }

      var { credentialPublicKey, credentialID, counter } = registrationInfo;

      var existingDevice = user.devices.find(
        (device) => device.credentialID === credentialID
      );

      if (!existingDevice) {
        var newDevice = {
          credentialPublicKey,
          credentialID,
          counter,
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
  }
);

export { router as webauthnRegisterFinish };
