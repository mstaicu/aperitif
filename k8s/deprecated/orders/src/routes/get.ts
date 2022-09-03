import express, { Request, Response, NextFunction } from "express";
import { param } from "express-validator";
import mongoose from "mongoose";

import {
  NotFoundError,
  NotAuthorizedError,
  requireAuthHandler,
  validateRequestHandler,
} from "@tartine/common";

import { Order } from "../models/order";

const router = express.Router();

router.get(
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

      return res.status(200).send(order);
    } catch (err) {
      next(err);
    }
  }
);

export { router as getOrderRouter };
