import express, { Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import mongoose from "mongoose";

import {
  validateRequestHandler,
  requireAuthHandler,
  NotFoundError,
  NotAuthorizedError,
  BadRequestError,
} from "@tartine/common";

import { Order, OrderStatus } from "../models/order";
import { Payment } from "../models/payment";

import { stripe } from "../stripe";

const router = express.Router();

router.use(express.json());

/**
 * TODO: Rewrite this route handler for Product purchases, along with the webhook for confirming the payment
 */
router.post(
  "/checkout",
  requireAuthHandler,
  [
    body("orderId")
      .not()
      .isEmpty()
      .custom(mongoose.Types.ObjectId.isValid)
      .withMessage("'orderId' must be provided"),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.body;

      const order = await Order.findById(orderId);

      if (!order) {
        throw new NotFoundError();
      }

      if (order.userId !== req.user!.userId) {
        throw new NotAuthorizedError(
          "The requested order does not belong to the current user"
        );
      }

      if (order.status === OrderStatus.Cancelled) {
        throw new BadRequestError("Cannot pay for a cancelled order");
      }

      const paymentProcessed = await Payment.findOne({ orderId });

      /**
       * TODO: Checkout if there is a checkout session in progress for this order
       */
      if (paymentProcessed) {
        throw new BadRequestError("Order has already been paid for");
      }

      /**
       * TODO: Create a checkout session and send back the session id
       * 
       * Once the subscription has been paid for, i.e. moves into the 'active' status
       * through a notification via the webhook, store it in the payments db along with the
       * orderId and userId
       */
      const { client_secret: clientSecret } =
        await stripe.paymentIntents.create(
          {
            currency: "gbp",
            amount: order.price * 100,
            metadata: {
              orderId: order.id,
            },
          },
          { idempotencyKey: order.id }
        );

      res.status(200).send({ clientSecret });
    } catch (err) {
      next(err);
    }
  }
);

export { router as paymentIntentRouter };
