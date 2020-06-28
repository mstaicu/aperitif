import { getEmail } from '../services';

const canDeleteEmail = async (id, { req }) => {
  try {
    const { result: email, err: lookupError } = await getEmail(id);

    /**
     * todo: revisit this, write a different policy for proving ownership
     */
    if (lookupError) {
      throw new Error('You do not own this resource');
    }

    if (email.to !== req.user.id) {
      throw new Error('You do not have permission to delete this resource');
    }
  } catch (err) {
    throw new Error(err.message);
  }
};

export { canDeleteEmail };
