import {
  connect,
  ConnectionError,
  TimeoutError,
} from "@nats-io/transport-node";
import { setTimeout } from "node:timers/promises";

/**
 * @param {AbortSignal} signal
 */
export async function getNc(signal) {
  if (!process.env.NATS_URL) {
    throw new Error("NATS_URL is required");
  }

  while (true) {
    signal.throwIfAborted();

    try {
      return await connect({
        name: "accounts-worker",
        servers: [process.env.NATS_URL],
        timeout: 2_000,
      });
    } catch (err) {
      if (!(err instanceof ConnectionError) && !(err instanceof TimeoutError)) {
        throw err;
      }

      await setTimeout(1_000, undefined, { signal });
    }
  }
}

/**
 * @typedef {Awaited<ReturnType<typeof getNc>>} NatsConnection
 */
