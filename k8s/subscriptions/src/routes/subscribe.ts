import express, { Request, Response, NextFunction } from "express";
import { body } from "express-validator";

import {
  validateRequestHandler,
  requireAuthHandler,
  BadRequestError,
} from "@tartine/common";

import { stripe } from "../stripe";
/**
 *
 */
const router = express.Router();
/**
 *
 */
router.post(
  "/subscribe",
  requireAuthHandler,
  [
    body("priceId")
      .isString()
      .withMessage("A valid 'priceId' must be provided with this request"),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      /**
       * TODO: Since we require a authenticated request to this route, do we still need to check
       * for the exitence of a customer?
       */
      let customer = await stripe.customers.retrieve(req.user.id);

      if (!customer) {
        throw new BadRequestError(
          "The provided user identifier does not belong to any of our customers"
        );
      }

      let { priceId } = req.body;

      let price = await stripe.prices.retrieve(priceId);

      if (!price) {
        throw new BadRequestError(
          "The provided 'priceId' does not belong to any plans that we offer"
        );
      }

      let { url } = await stripe.checkout.sessions.create({
        mode: "subscription",

        line_items: [{ price: priceId, quantity: 1 }],

        customer: req.user.id,

        /**
         * TODO: When purchasing a subscription, should we allow a trial version of that plan?
         */

        // subscription_data: {
        //   trial_period_days: 30,
        // },

        // payment_method_collection: "if_required",

        success_url: `https://${process.env.DOMAIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://${process.env.DOMAIN}/checkout/cancelled`,
      });

      if (!url) {
        throw new BadRequestError(
          "Something went wrong while trying to initiate the checkout"
        );
      }

      return res.status(200).json({
        url,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as stripeSubscribeRouter };
