// @ts-check
import express from "express";
import { header, body, validationResult } from "express-validator";
import { verify } from "jsonwebtoken";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

import { User } from "../models/users.js";

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

      var tokenPayload;

      try {
        tokenPayload = verify(token, "LOGIN_ACCESS_TOKEN");
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
       * TODO: Retrieve the expected challenge from Redis
       */
      // var challengeKey = `webauthnChallenge:register:${tokenPayload.email}`;
      // var expectedChallenge = await redisClient.get(challengeKey);
      // if (!expectedChallenge) {
      //   return return res.status(401).json({
      //   type: "https://example.com/errors/unauthorized",
      //   title: "Unauthorized",
      //   status: 401,
      //   detail: "Challenge expired or not found",
      // });
      // }
      var expectedChallenge = "";

      /**
       * @type {import('@simplewebauthn/server').VerifiedRegistrationResponse}
       */
      var verifiedRegistrationResponse;

      try {
        verifiedRegistrationResponse = await verifyRegistrationResponse({
          response: registrationResponse,
          expectedChallenge: `${expectedChallenge}`,
          expectedOrigin: "http://localhost",
          expectedRPID: "localhost",
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

        // TODO: Remove challenge from Redis
        // await redisClient.del(challengeKey);
      }

      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }
);

export { router as webauthnRegisterFinish };
