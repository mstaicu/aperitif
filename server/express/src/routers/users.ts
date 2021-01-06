import { Router } from 'express';

import { validate } from '../middleware';
import { login, signup } from '../routes/users';
import { signupPayload, loginPayload } from '../schemas/validation';

const usersRouter = Router();

usersRouter.post('/signup', validate({ body: signupPayload }), signup);
usersRouter.post('/login', validate({ body: loginPayload }), login);

export { usersRouter };
