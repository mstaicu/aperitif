import dotenv from 'dotenv';

const envFound = dotenv.config();

if (!envFound) {
  throw new Error(
    '⚠ No .env configuration file found at the root of the project',
  );
}

export const env = {
  port: parseInt(process.env.PORT, 10),
  logging: {
    morgan: {
      level: process.env.MORGAN_LEVEL,
    },
  },
  signature: process.env.SIGNATURE,
};
