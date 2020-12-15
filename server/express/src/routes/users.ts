import { Request, Response } from 'express';

import * as UsersController from '../controllers/users';

const signup = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const { result: createdUser, err } = await UsersController.signup(
      email,
      password,
    );

    if (err || !createdUser) {
      return res.status(422).send({ err });
    }

    return res.status(201).send({ userId: createdUser.id });
  } catch (err) {
    console.error(err);
  }
};

const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const { result: token, err } = await UsersController.login(email, password);

    if (err || !token) {
      return res.status(422).send({ err });
    }

    return res.status(200).send({ token });
  } catch (err) {
    console.error(err);
  }
};

export { signup, login };
