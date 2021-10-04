import Queue from "bull";

import { natsWrapper } from "../events/nats-wrapper";
import { ExpirationCompletePublisher } from "../events/publishers";

interface Payload {
  orderId: string;
}

const expirationQueue = new Queue<Payload>("order:expiration", {
  redis: {
    host: process.env.REDIS_HOST,
  },
});

expirationQueue.process((job) =>
  new ExpirationCompletePublisher(natsWrapper.client).publish({
    orderId: job.data.orderId,
  })
);

export { expirationQueue };
