const basicAuthentication = findUser => (req, res, next) => {
  const header = req.headers.authorization || '';

  /**
   * “The credentials are formatted as username:password, then converted from ASCII to Base 64”
   */
  const [type, payload] = header.split(' ');

  if (type === 'Basic') {
    const credentials = Buffer.from(payload, 'base64').toString('ascii');

    const [username, password] = credentials.split(':');

    const user = findUser({ username, password });

    if (user) {
      req.user = user;
    }
  }

  next();
};

export { basicAuthentication };
