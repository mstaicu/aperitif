import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be defined as an environment variable");
}

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "STRIPE_SECRET_KEY must be defined as an environment variable"
  );
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error(
    "STRIPE_WEBHOOK_SECRET must be defined as an environment variable"
  );
}

jest.mock("../events/nats");

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = new MongoMemoryServer();
  const mongoUri = await mongo.getUri();

  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  /**
   * Reset the publisher call data
   */
  jest.clearAllMocks();

  for (let collection of await mongoose.connection.db.collections()) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongo.stop();
});

declare global {
  function getSessionCookie(additionalPayload?: { userId?: string }): string[];
}

global.getSessionCookie = (additionalPayload = {}) => {
  // Build a JWT payload.  { id, email }
  const payload = {
    userId: new mongoose.Types.ObjectId().toHexString(),
    ...additionalPayload,
  };

  // Create the JWT!
  const token = jwt.sign(payload, process.env.JWT_SECRET!);

  // Build session Object. { jwt: MY_JWT }
  const session = { jwt: token };

  // Turn that session into JSON
  const sessionJSON = JSON.stringify(session);

  // Take JSON and encode it as base64
  const base64 = Buffer.from(sessionJSON).toString("base64");

  // return a string thats the cookie with the encoded data
  return [`express:sess=${base64}`];
};
