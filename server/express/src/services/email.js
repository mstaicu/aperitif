/**
 * Move to ORM model
 */
import emails from '../fixtures/emails';

import { generateId } from '../utils';

const getEmails = async () => {
  try {
    return { result: emails };
  } catch (err) {
    console.error(err);
  }
};

const getEmail = async id => {
  try {
    const result = emails.find(email => email.id === id);

    if (!result) {
      return { err: { message: 'No email found' } };
    }

    return { result };
  } catch (err) {
    console.error(err);
  }
};

const createEmail = async (from, to, subject, body) => {
  try {
    const result = {
      id: generateId(),
      from,
      to,
      subject,
      body,
    };

    emails.push(result);

    return { result };
  } catch (err) {
    console.error(err);
  }
};

const deleteEmail = async id => {
  try {
    const emailIndex = emails.findIndex(email => email.id === id);

    if (emailIndex < 0) {
      return {
        err: { message: 'No email found' },
      };
    }

    /**
     * Replace with ORM
     */
    const [result] = emails.splice(emailIndex, 1);

    return {
      result,
    };
  } catch (err) {
    console.error(err);
  }
};

export { getEmails, getEmail, createEmail, deleteEmail };
