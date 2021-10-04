import express, { Request, Response, NextFunction } from "express";

import { requireAuthHandler } from "@tartine/common";

import { Order } from "../models/order";

const router = express.Router();

router.get(
  "/",
  requireAuthHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      /**
       * TODO: Paginate
       */
      const orders = await Order.find({
        userId: req.user!.userId,
      }).populate("ticket");

      return res.status(200).send(orders);
    } catch (err) {
      next(err);
    }
  }
);

export { router as allOrdersRouter };
