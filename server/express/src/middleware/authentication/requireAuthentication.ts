import { Request, Response, NextFunction } from 'express';

const requireAuthentication = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.user) {
    next();
  } else {
    res.sendStatus(401);
    return;
  }
};

export { requireAuthentication };
