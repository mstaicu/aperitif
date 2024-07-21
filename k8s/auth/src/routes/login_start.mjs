// @ts-check
import express from "express";
import { checkSchema, validationResult } from "express-validator";
import { sign } from "jsonwebtoken";
import nconf from "nconf";

var router = express.Router();

router.post(
  "/login/start",
  checkSchema(
    {
      email: {
        isEmail: true,
        errorMessage: "'email' must be provided",
      },
    },
    ["body"]
  ),
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

      var accessToken = sign({ email }, nconf.get("LOGIN_ACCESS_TOKEN"), {
        expiresIn: "15m",
      });

      let url = new URL(nconf.get("ORIGIN"));
      url.pathname = "/login";
      url.searchParams.set("token", accessToken);

      /**
       * TODO: Send email
       *
       * res.sendStatus(200)
       */

      res.status(200).json({
        accessToken,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as loginStartRouter };
