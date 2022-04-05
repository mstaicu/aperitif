import cookie from "cookie";
import cookieSignature from "cookie-signature";
import { Request, Response, NextFunction } from "express";

import { BadRequestError } from "../errors";

export type UserSessionPayload = {
  userId: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: UserSessionPayload;
    }
  }
}

type Args = {
  cookieName: string;
  cookieSecret: string;
};

export const sessionCookieHandler =
  ({ cookieName, cookieSecret }: Args) =>
  (req: Request, _: Response, next: NextFunction) => {
    try {
      const cookies = cookie.parse(req.headers.cookie || "");
      const sessionCookie = cookies[cookieName];

      if (!sessionCookie) {
        throw new BadRequestError(
          "No session cookie supplied with the request"
        );
      }

      const unsignedValue = cookieSignature.unsign(sessionCookie, cookieSecret);

      if (unsignedValue !== false) {
        try {
          const payload = JSON.parse(
            Buffer.from(unsignedValue, "base64").toString("utf8")
          ) as UserSessionPayload;

          req.user = payload;
        } catch (err) {
          throw new BadRequestError(
            "Invalid session cookie supplied with the request"
          );
        }
      } else {
        throw new BadRequestError(
          "Invalid session cookie supplied with the request"
        );
      }
    } catch (err) {
      next(err);
    }

    next();
  };
