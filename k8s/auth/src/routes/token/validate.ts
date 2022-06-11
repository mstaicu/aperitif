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
import type { UserPayload } from "@tartine/common";

import { stripe } from "../../stripe";

let router = express.Router();

let magicTokenExpiration =
  1000 /** one second */ * 60 /** one minute */ * 30; /** 30 mins */
let jsonWebTokenExpiration = 15; /** 15 mins */

router.post(
  "/token/validate",
  [
    body("token")
      .notEmpty()
      .withMessage("A 'token' must be provided with this request"),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let { token } = req.body;

      let payload;

      try {
        payload = JSON.parse(
          /**
           * The decodeURIComponent call does not affect already decoded URI components
           */
          decryptMagicLinkPayload(decodeURIComponent(token))
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
      let { data: customers } = await stripe.customers.list({
        email: payload.email,
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

      let [subscription] = subscriptions;
      let {
        items: {
          data: [item],
        },
      } = subscription;

      /**
       * Inital token expiration date set to 15 minutes from the moment of this request
       */
      let expiresIn = new Date();
      expiresIn.setMinutes(expiresIn.getMinutes() + jsonWebTokenExpiration);

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
       *
       */
      let jsonWebTokenPayload: UserPayload = {
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
       * How many seconds are there between now and expiresIn?
       */
      let expiresInSeconds = Math.trunc(
        (expiresIn.getTime() - Date.now()) / 1000
      );

      /**
       * Sign...
       */
      let jsonWebToken = sign(
        jsonWebTokenPayload,
        process.env.SESSION_JWT_SECRET!,
        {
          expiresIn: expiresInSeconds,
        }
      );

      /**
       * and ship 🚢
       */
      return res.status(200).json({
        jsonWebToken,
        landingPage: payload.landingPage,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as validateMagicTokenRouter };
