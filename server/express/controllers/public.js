import {
  createUser,
  getUserByEmail,
  comparePasswords,
  issueToken,
} from '../services/public';

const signup = createUser;

const login = async (email, password) => {
  try {
    const { result: user, err: userLookupError } = getUserByEmail(email);

    if (userLookupError) {
      return { err: userLookupError };
    }

    const { err: passwordMatchError } = await comparePasswords(
      user.password,
      password,
    );

    if (passwordMatchError) {
      return {
        err: passwordMatchError,
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
  }
};

export { signup, login };
