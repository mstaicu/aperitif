import express from "express";
import { body } from "express-validator";
import { sign } from "jsonwebtoken";

import type { NextFunction, Request, Response } from "express";

import {
  BadRequestError,
  decryptMagicLinkPayload,
  validateRequestHandler,
} from "@tartine/common";

import { stripe } from "../stripe";

const router = express.Router();

let magicTokenExpiration =
  1000 /** one second */ * 60 /** one minute */ * 30; /** 30 mins */

type MagicLinkPayload = {
  email: string;
  landingPage: string;
  creationDate: string;
};

function isMagicLinkPayload(obj: any): obj is MagicLinkPayload {
  return (
    typeof obj === "object" &&
    typeof obj.email === "string" &&
    typeof obj.landingPage === "string" &&
    typeof obj.creationDate === "string"
  );
}

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

      /**
       * The decodeURIComponent call does not affect already decoded URI components
       */
      try {
        payload = JSON.parse(
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
       * Enter Stripe
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
          "The provided email address does not have any subscription with us"
        );
      }

      let [subscription] = subscriptions;

      let tokenPayload = {
        customerId: customer.id,
        subscription: {
          status: subscription.status,
        },
      };

      let token = sign(tokenPayload, process.env.SESSION_JWT_SECRET!, {
        expiresIn: "30m" /** expiresIn: subscription.current_period_end */,
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
