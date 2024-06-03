import express from "express";
import { body } from "express-validator";
import { sign, verify, TokenExpiredError } from "jsonwebtoken";

import type { NextFunction, Request, Response } from "express";

import {
  BadRequestError,
  isMagicLinkPayload,
  validateRequestHandler,
} from "@tartine/common";
import type { UserPayload } from "@tartine/common";

import { User } from "../../models/user";

let router = express.Router();

let accessTokenMinuteExpiration = 2; /** 2 mins */
let refreshTokenMinuteExpiration = 15; /** 15 mins */

/**
 *
 * TODO: Check if this endpoint was requested with a Bearer auth header?
 * Invalidate the refresh tokens for the owner of the Bearer refresh token?
 *
 */

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

      let payload;

      /**
       * TODO: Store the magic tokens and mark them as 'used' after they were validated?
       */
      try {
        payload = verify(
          decodeURIComponent(token),
          process.env.MAGIC_PAYLOAD_SECRET!
        );
      } catch (error) {
        if (error instanceof TokenExpiredError) {
          throw new BadRequestError("The provided magic token has expired");
        }

        throw new BadRequestError(
          "The provided magic token has failed verification checks"
        );
      }

      if (!isMagicLinkPayload(payload)) {
        throw new BadRequestError(
          "The provided magic token does not contain all the required fields"
        );
      }

      let user = await User.findOne({ email: payload.email }).populate(
        "subscription"
      );

      if (!user) {
        throw new BadRequestError(
          "The provided email address is not registered with us"
        );
      }

      /**
       * User has free-tier plan
       */
      if (!user.subscription || user.subscription.status !== "active") {
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
      }

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
       * Stripe timestamps are in seconds. They need to be converted to milliseconds
       * by multiply them by 1000 before using them to create dates
       */

      /**
       * If that date is past the end of the current period for which this subscription has been invoiced
       * then the new expiry date becomes the end date for the period which this subscription has been invoiced
       */

      let subscriptionPeriodEnd = new Date(
        user.subscription.current_period_end * 1000
      );

      if (user.subscription.cancel_at_period_end) {
        subscriptionPeriodEnd = new Date(user.subscription.cancel_at! * 1000);
      }

      /**
       * Check if the expiration time for both the access and refresh tokens
       * are within the subscription period
       */
      if (accessTokenExpiresIn > subscriptionPeriodEnd) {
        accessTokenExpiresIn = subscriptionPeriodEnd;
      }
      if (refreshTokenExpiresIn > subscriptionPeriodEnd) {
        refreshTokenExpiresIn = subscriptionPeriodEnd;
      }

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
