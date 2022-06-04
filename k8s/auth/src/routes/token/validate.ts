import express from "express";
import { body } from "express-validator";
import { sign } from "jsonwebtoken";

import type { NextFunction, Request, Response } from "express";

import {
  BadRequestError,
  isMagicLinkPayload,
  decryptMagicLinkPayload,
  validateRequestHandler,
} from "@tartine/common";
import type { SessionPayload } from "@tartine/common";

import { stripe } from "../../stripe";

const router = express.Router();

let magicTokenExpiration =
  1000 /** one second */ * 60 /** one minute */ * 30; /** 30 mins */
let tokenExpiration = 15; /** 15 mins */

router.post(
  "/token/validate",
  [
    body("magicToken")
      .notEmpty()
      .withMessage("A 'magicToken' must be provided with this request"),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let { magicToken } = req.body;

      let payload;

      try {
        payload = JSON.parse(
          /**
           * The decodeURIComponent call does not affect already decoded URI components
           */
          decryptMagicLinkPayload(decodeURIComponent(magicToken))
        );
      } catch (error) {
        throw new BadRequestError(
          "The provided magic token could not be decoded"
        );
      }

      if (!isMagicLinkPayload(payload)) {
        throw new BadRequestError(
          "The provided magic token does not contain all the required fields"
        );
      }

      let magicTokenCreationDate = new Date(payload.creationDate);
      let expirationTime =
        magicTokenCreationDate.getTime() + magicTokenExpiration;

      if (Date.now() > expirationTime) {
        throw new BadRequestError("The provided magic token has expired");
      }

      /**
       * ---------------------------------------------------------------------
       * Enter Stripe
       * ---------------------------------------------------------------------
       */
      const { data: customers } = await stripe.customers.list({
        email: payload.email,
      });

      const [customer] = customers;

      if (!customer) {
        throw new BadRequestError(
          "The provided email address is not registered with us"
        );
      }

      const { data: subscriptions } = await stripe.subscriptions.list({
        customer: customer.id,
      });

      if (subscriptions.length === 0) {
        throw new BadRequestError(
          "The provided email address does not have any active subscriptions with us"
        );
      }

      /**
       * TODO: What if... the user decides to purchase the same product twice,
       * i.e. have N subscriptions for the same product
       */
      let [subscription] = subscriptions;
      let {
        items: {
          data: [item],
        },
      } = subscription;

      /**
       *
       */
      let tokenPayload: SessionPayload = {
        user: {
          id: customer.id,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            cancel_at: subscription.cancel_at,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            product: {
              id: item.price.product,
            },
            price: {
              id: item.price.id,
              currency: item.price.currency,
              unit_amount: item.price.unit_amount,
            },
          },
        },
      };

      /**
       * Inital token expiration date set to 15 minutes from the moment of this request
       */
      let expiresIn = new Date();
      expiresIn.setMinutes(expiresIn.getMinutes() + tokenExpiration);

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

      /**
       * Sign...
       */
      let token = sign(tokenPayload, process.env.SESSION_JWT_SECRET!, {
        expiresIn: expiresInSeconds,
      });

      /**
       * and ship 🚢
       */
      return res.status(200).json({
        token,
        landingPage: payload.landingPage,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as validateMagicTokenRouter };
