import { Ticket } from "../ticket";

test("implements optimistic concurrency control", async () => {
  const ticket = Ticket.build({
    title: "concert",
    price: 5,
    userId: "123",
  });

  await ticket.save();

  const firstInstance = await Ticket.findById(ticket.id);
  const secondInstance = await Ticket.findById(ticket.id);

  // Make two separate changes to the same ticket through the two instances

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
  const ticket = Ticket.build({
    title: "concert",
    price: 5,
    userId: "123",
  });

  await ticket.save();
  expect(ticket.version).toBe(0);
  await ticket.save();
  expect(ticket.version).toBe(1);
  await ticket.save();
  expect(ticket.version).toBe(2);
});
