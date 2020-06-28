import {
  getEmails,
  getEmail,
  createEmail,
  deleteEmail,
} from '../services/email';

const getAll = getEmails;
const get = getEmail;
const create = createEmail;
const remove = deleteEmail;

export { getAll, get, create, remove };
