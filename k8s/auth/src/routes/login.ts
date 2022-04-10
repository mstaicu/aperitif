import express from "express";
import { body } from "express-validator";
import jwt from "jsonwebtoken";

import type { NextFunction, Request, Response } from "express";

import { BadRequestError, validateRequestHandler } from "@tartine/common";

import { User } from "../models/user";
import { Password } from "../services/password";

const router = express.Router();

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
      let { email, password } = req.body;

      let user = await User.findOne({ email });

      if (!user || !(await Password.compare(user.password, password))) {
        throw new BadRequestError(
          "Invalid credentials supplied for this account"
        );
      }

      let payload = { user: user.toJSON() };
      let token = jwt.sign(payload, process.env.SESSION_JWT_SECRET!, {
        expiresIn: "30m",
      });

      return res.status(200).send({
        token,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as loginRouter };
