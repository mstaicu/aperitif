export const nats = {
  client: {
    /**
     * This will be called by out base-publisher
     */
    publish: jest
      .fn()
      .mockImplementation(
        (subject: string, data: string, callback: () => void) => {
          callback();
        }
      ),
  },
};
