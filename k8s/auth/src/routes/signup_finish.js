// @ts-check
import express from "express";
import { body, validationResult } from "express-validator";
import { sign, verify } from "jsonwebtoken";

import { User } from "../models/users";

var router = express.Router();

router.post(
  "/signup/finish",
  [
    body("webauthnToken")
      .not()
      .isEmpty()
      .isString()
      .withMessage(
        "A valid 'webauthnToken' must be provided with this request"
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
      var errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      var { webauthnToken } = req.body;

      var webauthnTokenPayload;

      try {
        webauthnTokenPayload = verify(webauthnToken, "WEBAUTHN_TOKEN_SECRET");
      } catch (error) {
        return res.sendStatus(422);
      }

      if (
        !webauthnTokenPayload ||
        typeof webauthnTokenPayload === "string" ||
        !webauthnTokenPayload.email
      ) {
        return res.sendStatus(422);
      }

      var user = await User.findOne({ email: webauthnTokenPayload.email });

      if (!user) {
        user = new User({
          email: webauthnTokenPayload.email,
          devices: [],
        });

        await user.save();
      }

      /**
       * Reuse the token from the email for the webauthn registration
       */
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }
);

export { router as signupFinishRouter };
