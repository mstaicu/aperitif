import express, { Request, Response } from "express";

import { requireAuthHandler } from "@tartine/common";

import { Ticket } from "../models/ticket";

const router = express.Router();

router.get("/", requireAuthHandler, async (req: Request, res: Response) => {
  /**
   * TODO: Paginate
   */
  const tickets = await Ticket.find({ userId: req.user!.userId });
  res.status(200).send(tickets);
});

export { router as allTicketsRouter };
