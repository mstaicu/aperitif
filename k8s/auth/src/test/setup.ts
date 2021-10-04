import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  /**
   * Required environment variables
   */
  process.env.JWT_SECRET = "wat";

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
