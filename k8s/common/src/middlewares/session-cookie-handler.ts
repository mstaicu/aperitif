import cookie from "cookie";
import cookieSignature from "cookie-signature";
import { Request, Response, NextFunction } from "express";

import { BadRequestError } from "../errors";

interface UserPayload {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const sessionCookieHandler = (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const sessionCookie = cookies[process.env.SESSION_COOKIE_NAME!];

    if (!sessionCookie) {
      throw new BadRequestError("No session cookie supplied with the request");
    }

    const unsignedValue = cookieSignature.unsign(
      sessionCookie,
      process.env.SESSION_COOKIE_SECRET!
    );

    if (unsignedValue !== false) {
      try {
        const payload = JSON.parse(
          Buffer.from(unsignedValue, "base64").toString("utf8")
        ) as UserPayload;

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
