// @ts-check
import express from "express";
import { body } from "express-validator";

import { User } from "../models/users.js";

var router = express.Router();

router.post(
  "/token/send",
  [
    body("email")
      .isEmail()
      .withMessage(
        "A valid 'email' address must be provided with this request"
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
      var { email } = req.body;

      var user = await User.findOne({ email });

      if (!user) {
        return res.sendStatus(404);
      }

      try {
        return res.sendStatus(200);
      } catch (err) {}
    } catch (err) {
      next(err);
    }
  }
);

export { router as sendTokenRouter };
