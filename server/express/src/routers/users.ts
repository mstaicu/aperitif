import { Router } from 'express';

import { validateRequestBody } from '../middleware';
import { login, signup } from '../routes/users';
import { signupSchema, loginSchema } from '../schemas/validation';

const usersRouter = Router();

usersRouter.post('/signup', validateRequestBody(signupSchema), signup);
usersRouter.post('/login', validateRequestBody(loginSchema), login);

export { usersRouter };
