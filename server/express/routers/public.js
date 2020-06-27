import { Router } from 'express';

import { login, signup } from '../routes/public';

const publicRouter = Router();

publicRouter.post('/login', login);
publicRouter.post('/signup', signup);

export { publicRouter };
