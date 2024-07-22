// @ts-check
import express from "express";
import { header, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import nconf from "nconf";

import { User } from "../models/users.mjs";
import { redis } from "../utils/redis/index.mjs";

var router = express.Router();

var { verify } = jwt;

router.post(
  "/register/finish",
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
        tokenPayload = verify(token, nconf.get("REGISTRATION_ACCESS_TOKEN"));
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

export { router as registerFinishRouter };
