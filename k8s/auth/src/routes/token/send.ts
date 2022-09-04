import express from "express";
import { body } from "express-validator";

import type { NextFunction, Request, Response } from "express";

import {
  BadRequestError,
  //
  validateRequestHandler,
  sendLoginLink,
} from "@tartine/common";

import { User } from "../../models/user";

let router = express.Router();

router.post(
  "/token/send",
  [
    body("email")
      .isEmail()
      .withMessage(
        "A valid 'email' address must be provided with this request"
      ),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let { email, landingPage = "/user" } = req.body;

      let user = await User.findOne({ email });

      if (!user) {
        throw new BadRequestError(
          "The provided email address is not registered with us"
        );
      }

      try {
        await sendLoginLink({ email, landingPage });

        return res.status(200).json();
      } catch (err) {
        throw new BadRequestError(
          "Uh oh, something went wrong while trying to email you the login link"
        );
      }
    } catch (err) {
      next(err);
    }
  }
);

export { router as sendMagicLinkRouter };
