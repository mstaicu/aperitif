// @ts-check
import express from "express";
import { body, validationResult } from "express-validator";
import { sign, verify } from "jsonwebtoken";
import { User } from "../models/users";

var router = express.Router();

router.post(
  "/signup/finish",
  [
    body("token")
      .not()
      .isEmpty()
      .isString()
      .withMessage("A valid 'token' must be provided with this request"),
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

      var { token } = req.body;

      var tokenPayload;

      try {
        tokenPayload = verify(token, "MAGIC_LINK_SECRET");
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

      if (!user) {
        user = new User({
          email: tokenPayload.email,
          devices: [],
        });

        await user.save();
      }

      var webauthnToken = sign({ email: user.email }, "WEBAUTHN_START_SECRET", {
        expiresIn: "15m",
      });

      res.status(200).json({ webauthnToken });
    } catch (err) {
      next(err);
    }
  }
);

export { router as signupStartRouter };
