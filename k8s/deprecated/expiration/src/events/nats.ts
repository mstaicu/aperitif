import { default as nodeNatsStreaming, Stan } from "node-nats-streaming";

class Nats {
  private _client?: Stan;

  get client() {
    if (!this._client) {
      throw new Error(
        "Cannot access NATS client before connecting to the streaming server"
      );
    }

    return this._client;
  }

  connect = (
    clusterID: string,
    clientID: string,
    opts?: nodeNatsStreaming.StanOptions
  ) =>
    new Promise<void>((resolve, reject) => {
      this._client = nodeNatsStreaming.connect(clusterID, clientID, opts);
      //
      this.client.on("connect", () => {
        console.log("Successfully connected to NATS streaming server");
        resolve();
      });
      this.client.on("error", (err) => {
        console.log("Error connecting to NATS streaming server");
        reject(err);
      });
    });
}

export const nats = new Nats();
