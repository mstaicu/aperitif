import * as UsersController from '../controllers/users';

const signup = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { result: createdUser, err } = await UsersController.signup(
      email,
      password,
    );

    if (!err) {
      return res.status(201).send({ userId: createdUser.id });
    }

    return res.status(422).send({ err });
  } catch (err) {
    console.error(err);
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { result: token, err } = await UsersController.login(email, password);

    if (!err) {
      return res.status(200).send({ token });
    }

    return res.status(422).send({ err });
  } catch (err) {
    console.error(err);
  }
};

export { signup, login };
