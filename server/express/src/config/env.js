import dotenv from 'dotenv';

const result = dotenv.config();

if (result.error) {
  throw new Error('No .env configuration found at the root of the project');
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
