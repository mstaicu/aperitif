import * as EmailController from '../controllers/email';

const getAll = async (req, res) => {
  try {
    const { result, err } = await EmailController.getAll();

    if (!err) {
      return res.status(200).json({ result });
    }

    return res.status(422).json({ err });
  } catch (err) {
    console.error(err);
  }
};

const get = async (req, res) => {
  const { id } = req.params;

  try {
    const { result, err } = await EmailController.get(id);

    if (!err) {
      return res.status(200).json({ result });
    }

    return res.status(422).json({ err });
  } catch (err) {
    console.error(err);
  }
};

const create = async (req, res) => {
  const { from, to, subject, body } = req.body;

  try {
    const { err } = await EmailController.create(from, to, subject, body);

    if (!err) {
      return res.sendStatus(201);
    }

    return res.status(422).json({ err });
  } catch (err) {
    console.error(err);
  }
};

const remove = async (req, res) => {
  const { id } = req.params;

  try {
    const { err } = await EmailController.remove(id);

    if (!err) {
      return res.sendStatus(200);
    }

    return res.status(422).json({ err });
  } catch (err) {
    console.error(err);
  }
};

export { getAll, get, create, remove };
