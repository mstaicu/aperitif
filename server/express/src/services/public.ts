import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { AuthenticationError, ValidationError } from '../errors';
import { users } from '../fixtures/users';

const createUser = async (email: string, password: string) => {
  const user = users.find(user => user.email === email);

  if (user) {
    throw new ValidationError({
      details: 'We need an email address that is available',
      invalid_params: [
        {
          name: 'email',
          reason: `The email address is registered with us`,
        },
      ],
    });
  }

  const newUser = {
    id: crypto.randomBytes(8).toString('hex'),
    email,
    password: await bcrypt.hash(password, 10),
  };

  users.push(newUser);

  const payload = { id: newUser.id };

  return jwt.sign(payload, process.env.SIGNATURE, { expiresIn: '1h' });
};

const getToken = async (email: string, password: string) => {
  const user = users.find(user => user.email === email);

  if (!user) {
    throw new ValidationError({
      details: 'We need an email address that is registered with us',
      invalid_params: [
        {
          name: 'email',
          reason: `The email address is not registered with us`,
        },
      ],
    });
  }

  const passwordsMatch = await bcrypt.compare(password, user.password);

  if (!passwordsMatch) {
    throw new AuthenticationError();
  }

  const payload = { id: user.id };

  return jwt.sign(payload, process.env.SIGNATURE, { expiresIn: '1h' });
};

export { createUser, getToken };
