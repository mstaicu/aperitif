// @ts-check
import express from "express";
import { header, validationResult } from "express-validator";
import { verify } from "jsonwebtoken";

import { User } from "../models/users";

var router = express.Router();

router.post(
  "/signup/finish",
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

      try {
        tokenPayload = verify(token, "SIGNUP_TOKEN_SECRET");
      } catch (error) {
        return res.sendStatus(401);
      }

      if (
        !tokenPayload ||
        typeof tokenPayload === "string" ||
        !tokenPayload.email
      ) {
        return res.sendStatus(401);
      }

      var user = await User.findOne({ email: tokenPayload.email });

      if (!user) {
        user = new User({
          email: tokenPayload.email,
          devices: [],
        });

        await user.save();
      }

      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }
);

export { router as signupFinishRouter };
