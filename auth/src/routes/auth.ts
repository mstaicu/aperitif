import type { Request, Response, NextFunction } from 'express';

import { AuthController } from '../controllers';

const register = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  try {
    const token = await AuthController.register(email, password);
    return res.status(201).send({ token });
  } catch (err) {
    next(err);
  }
};

const signin = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  try {
    const token = await AuthController.signin(email, password);
    return res.status(200).send({ token });
  } catch (err) {
    next(err);
  }
};

export { register, signin };
