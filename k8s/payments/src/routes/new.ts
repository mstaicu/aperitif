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

import { nats } from "../events/nats";
import { PaymentCreatedPublisher } from "../events/publishers";

const router = express.Router();

router.post(
  "/",
  requireAuthHandler,
  [
    body("token").not().isEmpty().withMessage("'token' must be provided"),
    body("orderId")
      .not()
      .isEmpty()
      .custom(mongoose.Types.ObjectId.isValid)
      .withMessage("'ticketId' must be provided"),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, orderId } = req.body;

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

      const charge = await stripe.charges.create({
        currency: "gbp",
        amount: order.price * 100,
        source: token,
      });

      const payment = Payment.build({
        orderId,
        stripeChargeId: charge.id,
      });

      await payment.save();

      new PaymentCreatedPublisher(nats.client).publish({
        id: payment.id,
        orderId: payment.orderId,
        stripeChargeId: payment.stripeChargeId,
      });

      res.status(201).send({ id: payment.id });
    } catch (err) {
      next(err);
    }
  }
);

export { router as createChargeRouter };
