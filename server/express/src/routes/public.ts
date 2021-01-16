import type { Request, Response, NextFunction } from 'express';

import { UserController } from '../controllers';

const register = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  try {
    const token = await UserController.register(email, password);
    return res.status(201).send({ token });
  } catch (err) {
    next(err);
  }
};

const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  try {
    const token = await UserController.login(email, password);
    return res.status(200).send({ token });
  } catch (err) {
    next(err);
  }
};

export { register, login };
