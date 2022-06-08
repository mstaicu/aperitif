import express from "express";
import { body } from "express-validator";

import type { NextFunction, Request, Response } from "express";

import {
  BadRequestError,
  validateRequestHandler,
  sendMagicLink,
} from "@tartine/common";

import { stripe } from "../../stripe";

let router = express.Router();

router.post(
  "/token/send",
  [
    body("email")
      .isEmail()
      .withMessage("A valid email address must be provided with this request"),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      /**
       *
       */
      let { email, landingPage = "/user" } = req.body;

      /**
       *
       */

      let { data: customers } = await stripe.customers.list({
        email,
      });

      let [customer] = customers;

      if (!customer) {
        throw new BadRequestError(
          "The provided email address is not registered with us"
        );
      }

      let { data: subscriptions } = await stripe.subscriptions.list({
        customer: customer.id,
      });

      if (subscriptions.length === 0) {
        throw new BadRequestError(
          "The provided email address does not have any active subscriptions with us"
        );
      }

      /**
       *
       */
      try {
        await sendMagicLink(email, landingPage);
      } catch (err) {
        throw new BadRequestError(
          "Uh oh, something went wrong while trying to email you the magic link"
        );
      }

      return res.status(200).json();
    } catch (err) {
      next(err);
    }
  }
);

export { router as sendMagicLinkRouter };
