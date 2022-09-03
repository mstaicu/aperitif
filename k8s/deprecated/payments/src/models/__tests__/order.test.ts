import mongoose from "mongoose";

import { Order, OrderStatus } from "../order";

test("implements optimistic concurrency control", async () => {
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId: new mongoose.Types.ObjectId().toHexString(),
    status: OrderStatus.Created,
    version: 0,
    price: 10,
  });

  await order.save();

  const firstInstance = await Order.findById(order.id);
  const secondInstance = await Order.findById(order.id);

  // Make two separate changes to the same order through the two instances

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
    // console.log(err.message);
    return;
  }

  /**
   * This line will get called if the save works on the secondInstance
   */
  throw new Error("optimistic concurrency control failed");
});

test("increments the version number on multiple saves", async () => {
  const order = Order.build({
    id: new mongoose.Types.ObjectId().toHexString(),
    userId: new mongoose.Types.ObjectId().toHexString(),
    status: OrderStatus.Created,
    version: 0,
    price: 10,
  });

  await order.save();
  expect(order.version).toBe(0);
  await order.save();
  expect(order.version).toBe(1);
  await order.save();
  expect(order.version).toBe(2);
});
