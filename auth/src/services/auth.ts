import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import {
  RequestAuthenticationError,
  ExistingEmailError,
  NonExistingEmailError,
} from '../errors';
import { users } from '../fixtures/users';

const createUser = async (email: string, password: string) => {
  const user = users.find(user => user.email === email);

  if (user) {
    throw new ExistingEmailError();
  }

  const newUser = {
    id: crypto.randomBytes(8).toString('hex'),
    email,
    password: await bcrypt.hash(password, 10),
  };

  users.push(newUser);

  const payload = { id: newUser.id };

  return jwt.sign(payload, process.env.SIGNATURE!, { expiresIn: '1h' });
};

const getToken = async (email: string, password: string) => {
  const user = users.find(user => user.email === email);

  if (!user) {
    throw new NonExistingEmailError();
  }

  const passwordsMatch = await bcrypt.compare(password, user.password);

  if (!passwordsMatch) {
    throw new RequestAuthenticationError();
  }

  const payload = { id: user.id };

  return jwt.sign(payload, process.env.SIGNATURE!, { expiresIn: '1h' });
};

export { createUser, getToken };
