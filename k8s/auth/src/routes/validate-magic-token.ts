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

      try {
        payload = JSON.parse(decryptMagicLinkPayload(magicToken));
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

      /**
       * TODO: Relax the 'active' check
       */
      const { data: subscriptions } = await stripe.subscriptions.search({
        query: `status:\'active\' AND customer:\'${customer.id}\'`,
      });

      const [subscription] = subscriptions;

      if (!subscription) {
        throw new BadRequestError(
          "The provided email address does not have an active subscription with us"
        );
      }

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
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as validateMagicTokenRouter };
