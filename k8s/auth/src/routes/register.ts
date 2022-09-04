import express from "express";
import { body } from "express-validator";
import { sign } from "jsonwebtoken";

import type { NextFunction, Request, Response } from "express";

import {
  BadRequestError,
  //
  validateRequestHandler,
} from "@tartine/common";
import type { UserPayload } from "@tartine/common";

import { User } from "../models/user";

import { stripe } from "../stripe";

let router = express.Router();
/**
 *
 */
let accessTokenMinuteExpiration = 2; /** 2 mins */
let refreshTokenMinuteExpiration = 15; /** 15 mins */
/**
 *
 */
router.post(
  "/register",
  [
    body("email")
      .isEmail()
      .withMessage("A valid email address must be provided with this request"),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let { email } = req.body;

      /**
       * TODO: Find a sane way of checking if the email address is both registered on Stripe
       * and we have our systems reconcilled with Stripe's db
       */

      // let { data: customers } = await stripe.customers.list({
      //   email: email.toLocaleLowerCase(),
      //   limit: 1,
      // });
      // let userAccount = await User.findOne({ email });

      // let emailRegistered = userAccount && customers.length !== 0;

      let userAccount = await User.findOne({ email });

      if (userAccount) {
        throw new BadRequestError(
          "The provided email address is already registered with us"
        );
      }

      /**
       *
       */

      let { id } = await stripe.customers.create({
        email,
      });

      let user = User.build({
        id,
        email,
      });

      await user.save();

      /**
       *
       */
      let accessTokenPayload: UserPayload = {
        user: {
          id: user.id,
        },
      };
      let refreshTokenPayload: UserPayload = {
        user: {
          id: user.id,
        },
      };

      /**
       * Inital access token expiration date set to 2 minutes from the moment of this request
       */
      let accessTokenExpiresIn = new Date();
      accessTokenExpiresIn.setMinutes(
        accessTokenExpiresIn.getMinutes() + accessTokenMinuteExpiration
      );

      /**
       * Refresh token expiration date set to 15 minutes from the moment of this request
       */
      let refreshTokenExpiresIn = new Date();
      refreshTokenExpiresIn.setMinutes(
        refreshTokenExpiresIn.getMinutes() + refreshTokenMinuteExpiration
      );

      /**
       * Get the number of seconds until each token expires
       * We need the value in seconds for the expires clause when creating the tokens
       */
      let accessTokenExpiresInSeconds = Math.trunc(
        (accessTokenExpiresIn.getTime() - Date.now()) / 1000
      );

      let refreshTokenExpiresInSeconds = Math.trunc(
        (refreshTokenExpiresIn.getTime() - Date.now()) / 1000
      );

      /**
       *
       */
      let newAccessToken = sign(
        accessTokenPayload,
        process.env.ACCESS_TOKEN_SECRET!,
        {
          expiresIn: accessTokenExpiresInSeconds,
        }
      );

      let newRefreshToken = sign(
        refreshTokenPayload,
        process.env.REFRESH_TOKEN_SECRET!,
        {
          expiresIn: refreshTokenExpiresInSeconds,
        }
      );

      user.refreshTokens = [...user.refreshTokens, newRefreshToken];
      await user.save();

      return res.status(200).json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as registerRouter };
