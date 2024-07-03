// @ts-check
import express from "express";
import { body, validationResult } from "express-validator";
import { verify } from "jsonwebtoken";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

import { User } from "../models/users.js";

var router = express.Router();

router.post(
  "/webauthn/register/finish",
  [
    body("token")
      .not()
      .isEmpty()
      .isString()
      .withMessage("A valid 'token' must be provided with this request"),
    body("registrationResponse")
      .not()
      .isEmpty()
      .isObject()
      .withMessage(
        "A non empty 'registrationResponse' must be provided with this request"
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
       *  registrationResponse: import('@simplewebauthn/types').RegistrationResponseJSON
       *  token: String
       * }}
       */
      var { registrationResponse, token } = req.body;

      /**
       * TODO: Retrieve the expected challenge from Redis
       */
      var expectedChallenge = "";

      /**
       * TODO: Wish I could get rid of the token here and get the userName from somewhere else
       */
      var tokenPayload;

      try {
        tokenPayload = verify(
          decodeURIComponent(token),
          "WEBAUTHN_START_SECRET"
        );
      } catch (err) {
        return res.sendStatus(422);
      }

      if (
        !tokenPayload ||
        typeof tokenPayload === "string" ||
        !tokenPayload.email
      ) {
        return res.sendStatus(422);
      }

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
