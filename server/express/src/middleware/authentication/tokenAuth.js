import jwt from 'jsonwebtoken';

import { env } from '../../config';

const tokenAuth = getUserBy => async (req, res, next) => {
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
     * Storing just the user id in the JWT payload.
     * Check the 'issueToken' function
     */
    const { id } = payload;

    const { result: user } = await getUserBy(id);

    if (user) {
      req.user = user;
    }
  }

  next();
};

export { tokenAuth };
