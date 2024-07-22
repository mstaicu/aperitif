// @ts-check
import express from "express";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import nconf from "nconf";

import { redis } from "../utils/redis/index.mjs";

var router = express.Router();

var { sign } = jwt;

router.post(
  "/register/start",
  body("email").isEmail().withMessage("'email' must be provided"),
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

      var { email } = req.body;

      var accessToken = sign(
        { email },
        nconf.get("REGISTRATION_ACCESS_TOKEN"),
        {
          expiresIn: "15m",
        }
      );

      await redis.setex(`registration:token:${accessToken}`, 900, "valid");

      let url = new URL(nconf.get("ORIGIN"));
      /**
       * This is the client web app or mobile view controller route
       * that takes over and finishes the registration
       */
      url.pathname = "/register";
      url.searchParams.set("token", accessToken);

      /**
       * TODO: Send email
       */

      res.status(200).json({
        accessToken,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as registerStartRouter };
