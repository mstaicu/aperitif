import express, { NextFunction, Request, Response } from "express";
import { body } from "express-validator";

import { validateRequestHandler, requireAuthHandler } from "@tartine/common";

import { Ticket } from "../models/ticket";

import { nats } from "../events/nats";

import { TicketCreatedPublisher } from "../events/publishers";

const router = express.Router();

router.post(
  "/",
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
      const { title, price } = req.body;

      const ticket = Ticket.build({
        title,
        price,
        userId: req.user!.userId,
      });

      await ticket.save();

      new TicketCreatedPublisher(nats.client).publish({
        id: ticket.id,
        title: ticket.title,
        price: ticket.price,
        userId: ticket.userId,
        version: ticket.version,
      });

      res.status(201).send(ticket);
    } catch (err) {
      next(err);
    }
  }
);

export { router as createTicketRouter };
