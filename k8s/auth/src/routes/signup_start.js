// @ts-check
import express from "express";
import { body, validationResult } from "express-validator";
import { sign } from "jsonwebtoken";

var router = express.Router();

router.post(
  "/signup/start",
  [body("email").isEmail().withMessage("'email' must be provided")],
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

      var { email } = req.body;

      var token = sign({ email }, "SIGNUP_TOKEN_SECRET", {
        expiresIn: "15m",
      });

      let url = new URL("https://localhost");
      url.pathname = "/signup";
      url.searchParams.set("token", token);

      /**
       * TODO: Send email
       *
       * res.sendStatus(200)
       */

      res.status(200).json({
        token,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as signupStartRouter };
