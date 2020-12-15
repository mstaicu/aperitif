import {
  getUserByEmail,
  createUser,
  comparePasswords,
  issueToken,
} from '../services/users';

const signup = createUser;

const login = async (email: string, password: string) => {
  try {
    const { result: user, err: lookupError } = await getUserByEmail(email);

    if (lookupError || !user) {
      return { err: lookupError };
    }

    const { err: matchError } = await comparePasswords(user.password, password);

    if (matchError) {
      return {
        err: matchError,
      };
    }

    /**
     * “A token can be anything that identifies the user, such as the string "I am user 1"
     * or an object like { userId: "1" }. For a token to be useful from a security perspective,
     * it must be difficult to forge.”
     *
     * The value that we put in the token will be the value returned by the jwt.verify
     */

    const { id } = user;

    return {
      result: issueToken({ id }),
    };
  } catch (err) {
    console.error(err);

    return {
      err: {
        message: 'Something went wrong while trying to login',
      },
    };
  }
};

export { signup, login };
