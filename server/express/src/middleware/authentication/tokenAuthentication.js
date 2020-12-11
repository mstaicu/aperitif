import jwt from 'jsonwebtoken';

import { env } from '../../config';

const tokenAuthentication = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type === 'Bearer') {
    let payload;

    try {
      payload = jwt.verify(token, env.signature);
    } catch (err) {
      res.sendStatus(401);
      return;
    }

    /**
     * Storing session-based metadata in the JWT
     */
    const { id } = payload;
    req.user = { id };
  }

  /**
   * Move to the next authentication middleware if the request has no Bearer token
   */
  next();
};

export { tokenAuthentication };
