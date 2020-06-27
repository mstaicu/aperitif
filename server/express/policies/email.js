import { getEmail } from '../services';

const canDeleteEmail = async (id, { req }) => {
  try {
    const { result: email } = await getEmail(id);

    if (email.to !== req.user.id) {
      throw new Error('You do not have permission to delete this resource');
    }
  } catch (err) {
    throw new Error(err.message);
  }
};

export { canDeleteEmail };
