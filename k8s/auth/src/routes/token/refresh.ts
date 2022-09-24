import express from "express";
import { sign, verify, TokenExpiredError } from "jsonwebtoken";

import type { NextFunction, Request, Response } from "express";

import { BadRequestError, CustomError, isRefreshToken } from "@tartine/common";
import type { UserPayload } from "@tartine/common";

import { User } from "../../models/user";

let router = express.Router();

let accessTokenMinuteExpiration = 2; /** 2 mins */
let refreshTokenMinuteExpiration = 15; /** 15 mins */

router.post(
  "/token/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let header = req.headers.authorization;

      if (!header) {
        throw new BadRequestError(
          "No Authorization header supplied with the request"
        );
      }

      let [type, refreshToken] = header.split(" ");

      if (type === "Bearer") {
        let user = await User.findOne({ refreshTokens: refreshToken }).populate(
          "subscription"
        );

        /**
         * Refresh token reuse detection
         */

        /**
         * If we can't find a user which holds the provided refresh token, then that means
         * that the provided refresh token has been invalidated ( removed ) from the user's refresh token list
         */
        if (!user) {
          try {
            /**
             * TODO: If the token is expired, should we still find the user and remove all its refresh tokens?
             */
            let payload = verify(
              refreshToken,
              process.env.REFRESH_TOKEN_SECRET!
            );

            if (!isRefreshToken(payload)) {
              throw new BadRequestError(
                "Refresh token payload contains incorrect or incomplete data"
              );
            }

            let tokenOwner = await User.findById(payload.user.id);

            if (!tokenOwner) {
              throw new BadRequestError(
                "No user found using data from the provided refresh token payload"
              );
            }

            /**
             * if the token is still valid, invalidate all the refresh tokens
             * of the user that the provided refresh token belongs to
             */
            tokenOwner.refreshTokens = [];
            await tokenOwner.save();

            throw new BadRequestError(
              "The owner of the provided refresh token has had his refresh tokens invalidated"
            );
          } catch (error) {
            if (error instanceof TokenExpiredError) {
              throw new BadRequestError(
                "The provided refresh token has expired"
              );
            }

            if (error instanceof CustomError) {
              throw error;
            }

            /**
             *
             */

            throw new BadRequestError(
              "The provided refresh token has failed verification checks"
            );
          }
        }

        /**
         * Refresh token rotation
         */

        /**
         * if the refresh token that was provided belongs to a user,
         * remove it from the user's existing refresh tokens
         *
         * this is because we are in the process of issuing a new pair
         * of access and refresh tokens
         */
        let userRefreshTokens = user.refreshTokens.filter(
          (userRefreshToken) => userRefreshToken !== refreshToken
        );

        try {
          verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);

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
           * Inital refresh token expiration date set to 15 minutes from the moment of this request
           */
          let refreshTokenExpiresIn = new Date();
          refreshTokenExpiresIn.setMinutes(
            refreshTokenExpiresIn.getMinutes() + refreshTokenMinuteExpiration
          );

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
            subscriptionPeriodEnd = new Date(
              user.subscription.cancel_at! * 1000
            );
          }

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

          user.refreshTokens = [...userRefreshTokens, newRefreshToken];
          await user.save();

          /**
           *
           */
          return res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });
        } catch (error) {
          user.refreshTokens = [...userRefreshTokens];
          await user.save();

          if (error instanceof TokenExpiredError) {
            throw new BadRequestError("The provided refresh token has expired");
          }

          if (error instanceof CustomError) {
            throw error;
          }

          /**
           *
           */

          throw new BadRequestError(
            "The provided refresh token has failed verification checks"
          );
        }
      } else {
        throw new BadRequestError(
          `Authorization strategy ${type} not supported`
        );
      }
    } catch (err) {
      next(err);
    }
  }
);

export { router as refreshTokenRouter };
