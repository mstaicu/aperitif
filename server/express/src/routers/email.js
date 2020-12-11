import { Router } from 'express';

import { getAll, get, create, remove } from '../routes/email';

// import { canDeleteEmail } from '../policies';

const emailRouter = Router();

emailRouter.get('/', getAll);
emailRouter.get('/:id', get);

emailRouter.post('/', create);
emailRouter.delete('/:id', remove);

export { emailRouter };
