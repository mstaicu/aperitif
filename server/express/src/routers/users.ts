import { Router } from 'express';
import { Validator } from 'express-json-validator-middleware';

import { login, signup } from '../routes/users';
import { signupPayload, loginPayload } from '../schemas/validation';

const { validate } = new Validator({});

const usersRouter = Router();

usersRouter.post('/signup', validate({ body: signupPayload }), signup);
usersRouter.post('/login', validate({ body: loginPayload }), login);

export { usersRouter };
