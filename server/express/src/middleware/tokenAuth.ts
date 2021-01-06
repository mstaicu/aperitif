import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * TODO: Move out of here
 */
interface JsonWebTokenPayload {
  id: number;
}

const tokenAuthentication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type === 'Bearer') {
    let payload;

    try {
      payload = jwt.verify(token, process.env.SIGNATURE);
    } catch (err) {
      res.sendStatus(401);
      return;
    }

    /**
     * Storing session-based metadata in the JWT
     */
    const { id } = payload as JsonWebTokenPayload;
    req.user = { id };
  }

  /**
   * Move to the next authentication middleware if the request has no Bearer token
   */
  next();
};

export { tokenAuthentication };
