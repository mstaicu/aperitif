import express, { Request, Response, NextFunction } from "express";

import { body } from "express-validator";

import {
  NotAuthorizedError,
  NotFoundError,
  BadRequestError,
  validateRequestHandler,
  requireAuthHandler,
} from "@tartine/common";

import { Ticket } from "../models/ticket";

import { nats } from "../events/nats";

import { TicketUpdatedPublisher } from "../events/publishers";

const router = express.Router();

router.put(
  "/:id",
  requireAuthHandler,
  [
    body("title").not().isEmpty().withMessage("A ticket title is required"),
    body("price")
      .isFloat({ gt: 0 })
      .withMessage("A ticket price must be greater than 0"),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticket = await Ticket.findById(req.params.id);

      if (!ticket) {
        throw new NotFoundError();
      }

      if (ticket.userId !== req.user!.userId) {
        throw new NotAuthorizedError("You do not own this resource");
      }

      if (ticket.orderId) {
        throw new BadRequestError("Cannot edit a reserve ticket");
      }

      const { title, price } = req.body;

      ticket.set({ title, price });

      await ticket.save();

      new TicketUpdatedPublisher(nats.client).publish({
        id: ticket.id,
        title: ticket.title,
        price: ticket.price,
        userId: ticket.userId,
        version: ticket.version,
      });

      res.status(200).send(ticket);
    } catch (err) {
      next(err);
    }
  }
);

export { router as updateTicketRouter };
