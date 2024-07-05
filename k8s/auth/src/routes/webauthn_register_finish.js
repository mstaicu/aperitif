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
        return res.status(400).json({ errors: errors.array() });
      }

      var header = req.headers.authorization || "";
      var [type, token] = header.split(" ");

      if (type !== "Bearer") {
        return res.sendStatus(401);
      }

      var tokenPayload;

      try {
        tokenPayload = verify(token, "SIGNUP_TOKEN_SECRET");
      } catch (err) {
        return res.sendStatus(401);
      }

      if (
        !tokenPayload ||
        typeof tokenPayload === "string" ||
        !tokenPayload.email
      ) {
        return res.sendStatus(401);
      }

      /**
       * @type {{
       *  registrationResponse: import('@simplewebauthn/types').RegistrationResponseJSON
       * }}
       */
      var { registrationResponse } = req.body;

      /**
       * TODO: Retrieve the expected challenge from Redis
       */
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
        return res.sendStatus(422);
      }

      var { verified, registrationInfo } = verifiedRegistrationResponse;

      if (verified && registrationInfo) {
        var { credentialPublicKey, credentialID, counter } = registrationInfo;

        var user = await User.findOne({ email: tokenPayload.email });

        if (user) {
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
          }
        }
      }

      // TODO: Remove challenge from Redis

      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }
);

export { router as webauthnRegisterFinish };
