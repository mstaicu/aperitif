// @ts-check
import express from "express";
import { header, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import nconf from "nconf";

import { User } from "../models/index.mjs";

var router = express.Router();

router.post(
  "/register/finish",
  [
    header("Authorization")
      .not()
      .isEmpty()
      .withMessage("'Authorization' header must be provided"),
  ],
  /**
   * @param {express.Request} req - The request object.
   * @param {express.Response} res - The response object.
   * @param {express.NextFunction} next - The next middleware function.
   * @returns {Promise}
   */
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
          type: "https://example.com/probs/unauthorized",
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
          nconf.get("REGISTRATION_ACCESS_TOKEN")
        );
      } catch (error) {
        return res.status(401).json({
          detail: "Invalid or expired authorization token",
          status: 401,
          title: "Unauthorized",
          type: "https://example.com/probs/unauthorized",
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
          type: "https://example.com/probs/unauthorized",
        });
      }

      var user = await User.findOne({ email: tokenPayload.email });

      if (!user) {
        user = new User({
          devices: [],
          email: tokenPayload.email,
        });

        await user.save();
      }

      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }
);

export { router as registerFinishRouter };
