import { Router } from 'express';

import { validateRequestBody } from '../middlewares';
import { signin, register } from '../routes';
import { registerSchema, loginSchema } from '../schemas/validation';

const router = Router();

router.post('/register', validateRequestBody(registerSchema), register);
router.post('/signin', validateRequestBody(loginSchema), signin);

export { router };
