import express, { Request, Response, NextFunction } from "express";
import { param } from "express-validator";
import mongoose from "mongoose";

import {
  NotFoundError,
  NotAuthorizedError,
  requireAuthHandler,
  validateRequestHandler,
} from "@tartine/common";

import { Order, OrderStatus } from "../models/order";

import { nats } from "../events/nats";
import { OrderCancelledPublisher } from "../events/publishers";

const router = express.Router();

router.delete(
  "/:orderId",
  requireAuthHandler,
  [
    param("orderId")
      .not()
      .isEmpty()
      .custom(mongoose.Types.ObjectId.isValid)
      .withMessage("'orderId' must be provided"),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await Order.findById(req.params.orderId).populate("ticket");

      if (!order) {
        throw new NotFoundError();
      }

      if (order.userId !== req.user!.userId) {
        throw new NotAuthorizedError(
          "This order does not belong to the current user"
        );
      }

      order.status = OrderStatus.Cancelled;

      await order.save();

      // publish an event to say that this order was cancelled

      // TODO: If we need to replicate the orders data to another service
      // add the versioning to this model and the version based update to the
      // service which replicates the orders data

      /**
       * TODO: Cancel the Bull job when this event is emitted
       */
      new OrderCancelledPublisher(nats.client).publish({
        id: order.id,
        version: order.version,
        ticket: {
          id: order.ticket.id,
        },
      });

      return res.status(200).send(order);
    } catch (err) {
      next(err);
    }
  }
);

export { router as cancelOrderRouter };
