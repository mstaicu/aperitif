import express, { Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import mongoose from "mongoose";

import {
  validateRequestHandler,
  requireAuthHandler,
  NotFoundError,
  BadRequestError,
} from "@tartine/common";

import { Ticket } from "../models/ticket";
import { Order, OrderStatus } from "../models/order";

import { nats } from "../events/nats";
import { OrderCreatedPublisher } from "../events/publishers";

const router = express.Router();

router.post(
  "/",
  requireAuthHandler,
  [
    body("ticketId")
      .not()
      .isEmpty()
      .custom(mongoose.Types.ObjectId.isValid)
      .withMessage("'ticketId' must be provided"),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticket = await Ticket.findById(req.body.ticketId);

      if (!ticket) {
        throw new NotFoundError();
      }

      if (await ticket.isReserved()) {
        throw new BadRequestError("Ticket is already reserved");
      }

      // Calculate an expiration date for this order
      const expirationDate = new Date();

      // TODO: Move to ENV vars
      const EXPIRATION_WINDOW_SECONDS = 15 * 60;

      expirationDate.setSeconds(
        expirationDate.getSeconds() + EXPIRATION_WINDOW_SECONDS
      );

      // Build the order and save it to the db
      const order = Order.build({
        userId: req.user!.userId,
        status: OrderStatus.Created,
        expiresAt: expirationDate,
        ticket,
      });

      await order.save();

      new OrderCreatedPublisher(nats.client).publish({
        id: order.id,
        version: order.version,
        status: order.status,
        userId: order.userId,
        expiresAt: order.expiresAt.toISOString(),
        ticket: {
          id: ticket.id,
          price: ticket.price,
        },
      });

      return res.status(201).send(order);
    } catch (err) {
      next(err);
    }
  }
);

export { router as newOrderRouter };
