import express, { Request, Response, NextFunction } from "express";
import { body } from "express-validator";

import { BadRequestError, validateRequestHandler } from "@tartine/common";

import { stripe } from "../stripe";

const router = express.Router();

router.use(express.json());

router.post(
  "/checkout",
  [
    body("priceId")
      .notEmpty()
      .withMessage(
        "A plan tier 'priceId', offered by Ticketing, must be provided with this request"
      ),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { priceId } = req.body;

      try {
        const { url } = await stripe.checkout.sessions.create({
          success_url: `https://${process.env.DOMAIN}/yaay?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `https://${process.env.DOMAIN}/naay`,
          line_items: [{ price: priceId, quantity: 1 }],
          mode: "subscription",
        });

        return res.status(201).json({
          url,
        });
      } catch (err) {
        throw new BadRequestError(
          "An error occured while trying to create a checkout session"
        );
      }
    } catch (err) {
      next(err);
    }
  }
);

export { router as stripeCheckoutRouter };
