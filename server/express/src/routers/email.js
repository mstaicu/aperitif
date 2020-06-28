import { Router } from 'express';
const { param } = require('express-validator');

import { getAll, get, create, remove } from '../routes/email';

import { canDeleteEmail } from '../policies';

const emailRouter = Router();

emailRouter.get('/', getAll);
emailRouter.get('/:id', get);

emailRouter.post('/', create);
emailRouter.delete('/:id', [param('id').custom(canDeleteEmail), remove]);

export { emailRouter };
