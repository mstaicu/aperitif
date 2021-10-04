import { Message, Stan } from "node-nats-streaming";

import { Subjects } from "../events/types";

interface Event {
  subject: Subjects;
  data: any;
}

export abstract class Listener<T extends Event> {
  abstract subject: T["subject"];
  abstract queueGroupName: string;
  abstract onMessage: (data: T["data"], msg: Message) => void;

  protected ackWait = 5 * 1000;
  protected client: Stan;

  constructor(client: Stan) {
    this.client = client;
  }

  subscriptionOptions = () =>
    this.client
      .subscriptionOptions()
      //
      .setManualAckMode(true)
      .setAckWait(this.ackWait)
      //
      .setDeliverAllAvailable()
      .setDurableName(this.queueGroupName);

  listen = () => {
    const subscription = this.client.subscribe(
      this.subject,
      this.queueGroupName,
      this.subscriptionOptions()
    );

    subscription.on("message", (msg: Message) => {
      console.log(
        `Event received: ${this.subject} / ${
          this.queueGroupName
        } ${msg.getSequence()}`
      );

      this.onMessage(this.parseMessage(msg), msg);
    });
  };

  parseMessage = (msg: Message) => {
    const data = msg.getData();

    return typeof data === "string"
      ? JSON.parse(data)
      : JSON.parse(data.toString("utf8"));
  };
}
