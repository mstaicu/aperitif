import express, { Request, Response, NextFunction } from "express";
import { body } from "express-validator";

import { validateRequestHandler, BadRequestError } from "@tartine/common";

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
  [
    body("customerId")
      .isEmail()
      .withMessage("A valid 'customerId' must be provided with this request"),
    body("priceId")
      .isString()
      .withMessage("A valid 'priceId' must be provided with this request"),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let { customerId, priceId } = req.body;

      let customer = await stripe.customers.retrieve(customerId);

      if (!customer) {
        throw new BadRequestError(
          "The provided customer id does not match any customers on our records"
        );
      }

      let price = await stripe.prices.retrieve(priceId);

      if (!price) {
        throw new BadRequestError(
          "The provided 'priceId' does not belong to any plans that we offer"
        );
      }

      /**
       * TODO: Add support to generate the checkout URL via HTTP REST calls
       *
       * Currently this is not possible as we're decrypting the customer id from the access token in Remix.
       * Thus, you cannot provide the 'customerId' because it is not exposed
       *
       */

      let { url } = await stripe.checkout.sessions.create({
        mode: "subscription",

        line_items: [{ price: priceId, quantity: 1 }],

        customer: customerId,

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

export { router as stripeSubscriptionRouter };
