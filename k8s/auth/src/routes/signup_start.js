// @ts-check
import express from "express";
import { body, validationResult } from "express-validator";
import { sign } from "jsonwebtoken";

var router = express.Router();

router.post(
  "/signup/start",
  [
    body("email")
      .isEmail()
      .withMessage("A valid 'email' must be provided with this request"),
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

      var { email } = req.body;

      var token = sign({ email }, "MAGIC_LINK_SECRET", {
        expiresIn: "15m",
      });

      /**
       * The URL should open the web app route or mobile app screen
       * that can take over the magic token and complete the signup
       * and webauthn flow
       */
      let url = new URL(`http://localhost`);
      url.pathname = "/signup";
      url.searchParams.set("token", token);

      /**
       * TODO: Send email
       */

      res.status(200).json({ token });
    } catch (err) {
      next(err);
    }
  }
);

export { router as signupStartRouter };
