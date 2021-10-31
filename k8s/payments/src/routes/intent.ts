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

router.post(
  "/intent",
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

      if (paymentProcessed) {
        throw new BadRequestError("Order has already been paid for");
      }

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
