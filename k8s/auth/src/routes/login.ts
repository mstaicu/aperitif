import express, { NextFunction, Request, Response } from "express";
import { body } from "express-validator";

import { BadRequestError, validateRequestHandler } from "@tartine/common";

import { User } from "../models/user";
import { Password } from "../services/password";

const router = express.Router();

/**
 * $ http POST http://ticketing/api/auth/login email=wtf@wa.com password=1asdasd
 */
router.post(
  "/login",
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

      const user = await User.findOne({ email });

      if (!user || !(await Password.compare(user.password, password))) {
        throw new BadRequestError("Invalid credentials");
      }

      return res.status(200).send(user);
    } catch (err) {
      next(err);
    }
  }
);

export { router as loginRouter };
