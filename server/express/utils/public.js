import bcrypt from 'bcrypt';
import crypto from 'crypto';

import jwt from 'jsonwebtoken';

import { env } from '../config';

/* Tune how long it takes to hash password.
   The longer, the more secure. */

const saltRounds = 10;

const createToken = payload =>
  jwt.sign(payload, env.signature, { expiresIn: '1h' });

const hash = async password => await bcrypt.hash(password, saltRounds);

/**
 * Generate the user ID
 */
const generateId = () => crypto.randomBytes(8).toString('hex');

export { createToken, generateId, hash };
