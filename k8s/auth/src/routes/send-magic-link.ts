import express from "express";
import { body } from "express-validator";

import type { NextFunction, Request, Response } from "express";

import {
  BadRequestError,
  validateRequestHandler,
  sendMagicLink,
} from "@tartine/common";

const router = express.Router();

router.post(
  "/send-magic-link",
  [
    body("email")
      .isEmail()
      .withMessage("A valid email address must be provided with this request"),
  ],
  /**
   * Don't validate the landingPage as we want it to be optional
   */
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let { email, landingPage = "/dashboard" } = req.body;

      try {
        await sendMagicLink(email, landingPage);
      } catch (err) {
        throw new BadRequestError(
          "Could not send an email with the magic link"
        );
      }

      return res.status(200);
    } catch (err) {
      console.log('WTFsssss', err)
      next(err);
    }
  }
);

export { router as sendMagicLinkRouter };
