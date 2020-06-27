import jwt from 'jsonwebtoken';

import { env } from '../../config';

const tokenAuth = findUser => async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type === 'Bearer') {
    let payload;

    try {
      payload = jwt.verify(token, env.signature);
    } catch (err) {
      res.status(401).end();
      return;
    }

    /**
     * storing just the user id in the JWT payload
     */
    const { id } = payload;

    const { result: user } = await findUser(id);

    if (user) {
      req.user = user;
    }
  }

  next();
};

export { tokenAuth };
