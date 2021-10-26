import Queue from "bull";

import { nats } from "../events/nats";
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
  new ExpirationCompletePublisher(nats.client).publish({
    orderId: job.data.orderId,
  })
);

export { expirationQueue };
