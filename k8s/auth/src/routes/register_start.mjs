// @ts-check
import express from "express";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import nconf from "nconf";

var router = express.Router();

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
          detail: "There were validation errors with your request",
          errors: errors.array(),
          status: 400,
          title: "Invalid Request",
          type: "https://example.com/probs/validation-error",
        });
      }

      var { email } = req.body;

      var accessToken = jwt.sign(
        { email },
        nconf.get("REGISTRATION_ACCESS_TOKEN"),
        {
          expiresIn: "15m",
        },
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
  },
);

export { router as registerStartRouter };
