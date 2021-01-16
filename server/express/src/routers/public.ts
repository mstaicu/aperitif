import { Router } from 'express';

import { validateRequestBody } from '../middlewares';
import { login, register } from '../routes';
import { registerSchema, loginSchema } from '../schemas/validation';

const publicRouter = Router();

publicRouter.post('/register', validateRequestBody(registerSchema), register);
publicRouter.post('/login', validateRequestBody(loginSchema), login);

export { publicRouter };
