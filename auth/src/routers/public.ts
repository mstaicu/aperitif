import { Router } from 'express';

import { validateRequestBody } from '../middlewares';
import { login, register } from '../routes';
import { registerSchema, loginSchema } from '../schemas/validation';

const router = Router();

router.post('/register', validateRequestBody(registerSchema), register);
router.post('/login', validateRequestBody(loginSchema), login);

export { router as publicRouter };
