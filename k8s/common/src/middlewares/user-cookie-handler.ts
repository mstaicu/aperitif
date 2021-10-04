import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

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

export const userCookieHandler = (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  /**
   * During signing and signup we store the JWT in a 'jwt' property on the req.session object
   * This in turn gets base64'd and attached to the cookie, which is sent with every request
   */
  if (!req.session?.jwt) {
    return next();
  }

  try {
    const payload = jwt.verify(
      req.session.jwt,
      process.env.JWT_SECRET!
    ) as UserPayload;

    req.user = payload;
  } catch (err) {}

  next();
};
