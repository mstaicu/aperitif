import { Message } from "node-nats-streaming";

import { Subjects, Listener, CustomerCreatedEvent } from "@tartine/common";

import { User } from "../../models/user";

export class CustomerCreatedListener extends Listener<CustomerCreatedEvent> {
  readonly subject = Subjects.CustomerCreated;

  queueGroupName = "customers-service";

  onMessage = async (data: CustomerCreatedEvent["data"], msg: Message) => {
    try {
      let { id, email } = data;

      let existingUser = await User.findById(id);

      if (existingUser) {
        throw new Error(
          "CustomerCreatedEvent contains a customer that is already registered"
        );
      }

      if (!email) {
        throw new Error(
          "CustomerCreatedEvent contains a falsy email address value"
        );
      }

      let user = User.build({
        id,
        email,
      });

      await user.save();

      msg.ack();
    } catch (err) {}
  };
}
