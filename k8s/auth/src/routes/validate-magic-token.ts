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

      let token = sign(tokenPayload, process.env.SESSION_JWT_SECRET!, {
        expiresIn: "30m",
      });

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
