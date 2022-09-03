import express, { Request, Response, NextFunction } from "express";
import { param } from "express-validator";
import mongoose from "mongoose";

import {
  requireAuthHandler,
  validateRequestHandler,
  NotFoundError,
  NotAuthorizedError,
} from "@tartine/common";

import { Ticket } from "../models/ticket";

const router = express.Router();

router.get(
  "/:id",
  requireAuthHandler,
  [
    param("id")
      .not()
      .isEmpty()
      .custom(mongoose.Types.ObjectId.isValid)
      .withMessage("A ticket identifier must be provided"),
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

      return res.status(200).send(ticket);
    } catch (err) {
      next(err);
    }
  }
);

export { router as showTicketRouter };
