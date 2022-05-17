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
import type { MagicLinkPayload, TokenPayload } from "@tartine/common";

import { stripe } from "../stripe";

const router = express.Router();

let magicTokenExpiration =
  1000 /** one second */ * 60 /** one minute */ * 30; /** 30 mins */

router.post(
  "/validate-magic-token",
  [
    body("magicToken")
      .notEmpty()
      .withMessage("A magic token must be provided with this request"),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let { magicToken } = req.body;

      let payload: Partial<MagicLinkPayload> = {};

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
      const { data: customers } = await stripe.customers.search({
        query: `email:'${payload.email}'`,
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
          "The provided email address does not have any active subscriptions"
        );
      }

      let [subscription] = subscriptions;
      let {
        items: {
          data: [item],
        },
      } = subscription;

      /**
       *
       */
      let tokenPayload: TokenPayload = {
        user: {
          id: customer.id,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            product: {
              id: item.price.product as string,
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
       * The JWT expires in 1 day from the time of the request
       *
       * If that date is past the end of the current period for which this subscription has been invoiced
       * then the new expiry date becomes the end date for the period which this subscription has been invoiced
       */

      let expiresIn = new Date();
      expiresIn.setDate(expiresIn.getDate() + 1);

      /**
       * Stripe timestamps need to be multiply by 1000 before using them to create dates
       */
      let subscriptionPeriodEnd = new Date(
        subscription.current_period_end * 1000
      );

      /**
       *
       */
      if (subscription.cancel_at_period_end) {
        subscriptionPeriodEnd = new Date(subscription.cancel_at! * 1000);
      }

      if (expiresIn > subscriptionPeriodEnd) {
        expiresIn = subscriptionPeriodEnd;
      }

      /**
       * How many seconds are there between now and expiresIn?
       */
      let expiresInSeconds = Math.round(
        Math.abs(expiresIn.getTime() - new Date().getTime()) / 1000
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
      return res.status(200).send({
        token,
        landingPage: payload.landingPage,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as validateMagicTokenRouter };
