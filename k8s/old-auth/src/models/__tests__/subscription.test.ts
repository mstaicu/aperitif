import mongoose from "mongoose";

import { Subscription } from "../subscription";

test("implements optimistic concurrency control", async () => {
  let subscription = Subscription.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    status: "active",
    cancel_at_period_end: false,
    cancel_at: 150000,
    current_period_end: 225000,
  });

  await subscription.save();

  let firstInstance = await Subscription.findById(subscription.id);
  let secondInstance = await Subscription.findById(subscription.id);

  firstInstance!.set({
    price: 10,
  });

  secondInstance!.set({
    price: 15,
  });

  await firstInstance!.save();

  try {
    /**
     * When we attempt to save the 2nd instance
     *
     * 1. The 2nd instance's 'version' value, which is 0, is added to the this.$where in the .pre save hook
     * 2. When mongoose submits this update request to mongodb, mongodb will fail to find a document
     *  with the specific ID and a version of 0
     * 3. Errors out with: "VersionError: No matching document found for id "6151da9e5ef7deb5d17ee1c2" version 0 modifiedPaths "price""
     */
    await secondInstance!.save();
  } catch (err) {
    return;
  }

  /**
   * This line will get called if the save works on the secondInstance
   */
  throw new Error("optimistic concurrency control failed");
});

test("increments the version number on multiple saves", async () => {
  let subscription = Subscription.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    status: "active",
    cancel_at_period_end: false,
    cancel_at: 150000,
    current_period_end: 225000,
  });

  await subscription.save();
  expect(subscription.version).toBe(0);
  await subscription.save();
  expect(subscription.version).toBe(1);
  await subscription.save();
  expect(subscription.version).toBe(2);
});
