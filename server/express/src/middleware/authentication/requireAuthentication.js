const requireAuthentication = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.sendStatus(401);
    return;
  }
};

export { requireAuthentication };
