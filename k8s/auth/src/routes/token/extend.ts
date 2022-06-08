import express from "express";
import { sign } from "jsonwebtoken";

import type { NextFunction, Request, Response } from "express";

import { BadRequestError, requireAuthHandler } from "@tartine/common";
import type { SessionPayload } from "@tartine/common";

let router = express.Router();

router.post(
  "/token/extend",
  requireAuthHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let { subscription } = req.user;

      /**
       * Inital token expiration date set to 15 minutes from the moment of this request
       */
      let expiresIn = new Date();
      expiresIn.setMinutes(expiresIn.getMinutes() + 15);

      /**
       * Stripe timestamps are in seconds. They need to be converted to milliseconds
       * by multiply them by 1000 before using them to create dates
       */
      let subscriptionPeriodEnd = new Date(
        subscription.current_period_end * 1000
      );

      if (subscription.cancel_at_period_end) {
        subscriptionPeriodEnd = new Date(subscription.cancel_at! * 1000);
      }

      /**
       * If that date is past the end of the current period for which this subscription has been invoiced
       * then the new expiry date becomes the end date for the period which this subscription has been invoiced
       */
      if (expiresIn > subscriptionPeriodEnd) {
        expiresIn = subscriptionPeriodEnd;
      }

      if (Date.now() > expiresIn.getTime()) {
        throw new BadRequestError("The user's active subscription has expired");
      }

      /**
       * How many seconds are there between now and expiresIn?
       */
      let expiresInSeconds = Math.trunc(
        (expiresIn.getTime() - Date.now()) / 1000
      );

      let payload: SessionPayload = {
        user: req.user,
      };

      /**
       * Sign...
       */
      let jsonWebToken = sign(payload, process.env.SESSION_JWT_SECRET!, {
        expiresIn: expiresInSeconds,
      });

      /**
       * and ship 🚢
       */
      return res.status(200).json({
        jsonWebToken,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as extendTokenRouter };
