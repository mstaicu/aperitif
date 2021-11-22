import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be defined as an environment variable");
}

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = new MongoMemoryServer();

  const mongoUri = await mongo.getUri();

  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  for (let collection of await mongoose.connection.db.collections()) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongo.stop();
});
