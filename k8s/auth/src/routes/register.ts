import express, { NextFunction, Request, Response } from "express";
import { body } from "express-validator";

import { BadRequestError, validateRequestHandler } from "@tartine/common";

import { User } from "../models/user";

const router = express.Router();

/**
 * $ http POST http://ticketing/api/auth/register email=wtf@wa.com password=1asdasd
 */
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Email must be valid"),
    body("password")
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage("Password must be between 4 and 20 characters"),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const existingUser = await User.findOne({ email });

      if (existingUser) {
        throw new BadRequestError("Email is already in use");
      }

      const user = User.build({ email, password });

      await user.save();

      return res.status(201).send(user);
    } catch (err) {
      next(err);
    }
  }
);

export { router as registerRouter };
