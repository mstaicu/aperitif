import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * todo: this should be a 'model' of an ORM
 */
import { users } from '../fixtures/users';

const getUserByEmail = async (email: string) => {
  try {
    /**
     * todo: this should be a 'model' of an ORM
     */
    const result = users.find(user => user.email === email);

    if (!result) {
      return { err: { message: 'No user found with the supplied email' } };
    }

    return { result };
  } catch (err) {
    return { err };
  }
};

const createUser = async (email: string, password: string) => {
  try {
    const newUser = {
      id: crypto.randomBytes(8).toString('hex'),
      email,
      password: await bcrypt.hash(password, 10),
    };

    /**
     * todo: this should be a 'model' of an ORM
     */
    users.push(newUser);

    return {
      result: newUser,
    };
  } catch (err) {
    return {
      err: {
        message: 'Something went wrong while trying to create your account',
      },
    };
  }
};

const comparePasswords = async (plain: any, encrypted: string) => {
  try {
    return {
      result: await bcrypt.compare(plain, encrypted),
    };
  } catch (err) {
    return {
      err: {
        message: 'Passwords do not match',
      },
    };
  }
};

const issueToken = (payload: any) =>
  jwt.sign(payload, process.env.SIGNATURE, { expiresIn: '1h' });

export { getUserByEmail, createUser, comparePasswords, issueToken };
