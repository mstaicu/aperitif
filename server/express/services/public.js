import bcrypt from 'bcrypt';

/**
 * todo: this should be a 'model' of an ORM
 */
import users from '../fixtures/users';

import { generateId, hash, createToken } from '../utils';

const getUserBy = prop => async value => {
  try {
    /**
     * todo: this should be a 'model' of an ORM
     */
    const result = users.find(user => user[prop] === value);

    if (!result) {
      return { err: { message: `No user found with the supplied ${prop}` } };
    }

    return { result };
  } catch (err) {
    return { err };
  }
};

const createUser = async (email, password) => {
  try {
    const newUser = {
      id: generateId(),
      //
      email,
      password: await hash(password),
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

const comparePasswords = async (firstPassword, secondPassword) => {
  try {
    return {
      result: await bcrypt.compare(firstPassword, secondPassword),
    };
  } catch (err) {
    return {
      err: {
        message: 'Passwords do not match',
      },
    };
  }
};

const issueToken = payload => createToken(payload);

export {
  getUserBy,
  //
  createUser,
  comparePasswords,
  issueToken,
};
