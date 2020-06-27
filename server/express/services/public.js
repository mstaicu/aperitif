import bcrypt from 'bcrypt';

/**
 * todo: this should be a 'model' of an ORM
 */
import users from '../fixtures/users';

import { generateId, hash, createToken } from '../utils';

/**
 * Since we're using the user id in the JWT token creation
 * we need to retrieve the user by its id, once a request
 * is made using the Bearer authentication strategy
 */
const getUserById = async id => {
  try {
    /**
     * todo: this should be a 'model' of an ORM
     */
    const result = users.find(user => user.id === id);

    if (!result) {
      return { err: 'No user found with the supplied ID' };
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
    console.error(err);
    return {
      err: 'Something went wrong while trying to create your account',
    };
  }
};

const getUserByEmail = async email => {
  try {
    /**
     * todo: this should be a 'model' of an ORM
     */
    const user = users.find(user => user.email === email);

    if (!user) {
      return { err: 'No user found for this email address' };
    }

    return { result: user };
  } catch (err) {
    return { err };
  }
};

const comparePasswords = async (firstPassword, secondPassword) => {
  try {
    const resolution = await bcrypt.compare(firstPassword, secondPassword);

    return {
      result: {
        resolution,
      },
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
  createUser,
  getUserByEmail,
  comparePasswords,
  issueToken,
  //
  getUserById,
};
