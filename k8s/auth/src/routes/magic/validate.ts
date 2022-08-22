import express from "express";
import { body } from "express-validator";
import { sign } from "jsonwebtoken";

import type { NextFunction, Request, Response } from "express";

import {
  BadRequestError,
  isMagicLinkPayload,
  decryptMagicLinkPayload,
  validateRequestHandler,
} from "@tartine/common";
import type { UserPayload } from "@tartine/common";

import { User } from "../../models/user";

let router = express.Router();

let magicTokenExpiration =
  1000 /** one second */ * 60 /** one minute */ * 30; /** 30 mins */
let accessTokenMinuteExpiration = 2; /** 2 mins */
let refreshTokenMinuteExpiration = 15; /** 15 mins */

router.post(
  "/token/validate",
  [
    body("token")
      .notEmpty()
      .isString()
      .withMessage("A 'token' must be provided with this request"),
  ],
  validateRequestHandler,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let { token } = req.body;

      /**
       * Start magic link payload check
       */
      let payload;

      try {
        payload = JSON.parse(
          /**
           * The decodeURIComponent call does not affect already decoded URI components
           */
          decryptMagicLinkPayload(decodeURIComponent(token))
        );
      } catch (error) {
        throw new BadRequestError(
          "The provided magic token could not be decoded"
        );
      }

      if (!isMagicLinkPayload(payload)) {
        throw new BadRequestError(
          "The provided magic token does not contain all the required fields"
        );
      }

      let magicTokenCreationDate = new Date(payload.creationDate);
      let expirationTime =
        magicTokenCreationDate.getTime() + magicTokenExpiration;

      if (Date.now() > expirationTime) {
        throw new BadRequestError("The provided magic token has expired");
      }

      /**
       *
       */

      let user = await User.findOne({ email: payload.email }).populate(
        "subscription"
      );

      if (!user) {
        throw new BadRequestError(
          "The provided email address is not registered with us"
        );
      }

      /**
       * TODO: Check if this endpoint was requested with a Bearer auth header?
       * Invalidate the refresh tokens for the owner of the Bearer refresh token?
       */

      if (user.subscription.status !== "active") {
        throw new BadRequestError(
          "The provided email address does not have any active subscriptions with us"
        );
      }

      /**
       * Check if the expiration time for both the access and refresh tokens
       * are within the subscription period
       */

      /**
       * Stripe timestamps are in seconds. They need to be converted to milliseconds
       * by multiply them by 1000 before using them to create dates
       */
      let subscriptionPeriodEnd = new Date(
        user.subscription.current_period_end * 1000
      );

      if (user.subscription.cancel_at_period_end) {
        subscriptionPeriodEnd = new Date(user.subscription.cancel_at! * 1000);
      }

      /**
       * Inital access token expiration date set to 2 minutes from the moment of this request
       */
      let accessTokenExpiresIn = new Date();
      accessTokenExpiresIn.setMinutes(
        accessTokenExpiresIn.getMinutes() + accessTokenMinuteExpiration
      );

      /**
       * Inital refresh token expiration date set to 15 minutes from the moment of this request
       */
      let refreshTokenExpiresIn = new Date();
      refreshTokenExpiresIn.setMinutes(
        refreshTokenExpiresIn.getMinutes() + refreshTokenMinuteExpiration
      );

      /**
       * If that date is past the end of the current period for which this subscription has been invoiced
       * then the new expiry date becomes the end date for the period which this subscription has been invoiced
       */
      if (accessTokenExpiresIn > subscriptionPeriodEnd) {
        accessTokenExpiresIn = subscriptionPeriodEnd;
      }
      if (refreshTokenExpiresIn > subscriptionPeriodEnd) {
        refreshTokenExpiresIn = subscriptionPeriodEnd;
      }

      if (Date.now() > accessTokenExpiresIn.getTime()) {
        throw new BadRequestError("The user's active subscription has expired");
      }

      /**
       *
       */
      let accessTokenPayload: UserPayload = {
        user: {
          id: user.id,
          subscription: {
            id: user.subscription.id,
            status: user.subscription.status,
          },
        },
      };

      let refreshTokenPayload: UserPayload = {
        user: {
          id: user.id,
          subscription: {
            id: user.subscription.id,
            status: user.subscription.status,
          },
        },
      };

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

      /**
       *
       */

      user.refreshTokens = [...user.refreshTokens, newRefreshToken];
      await user.save();

      /**
       *
       */
      return res.status(200).json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as validateMagicTokenRouter };
