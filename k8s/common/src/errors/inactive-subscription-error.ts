import { CustomError } from "./custom-error";

export class InactiveSubscriptionError extends CustomError {
  statusCode = 403;

  constructor() {
    super("You do not have any active subscriptions with us");
    Object.setPrototypeOf(this, InactiveSubscriptionError.prototype);
  }

  serializeResponse = () => ({
    title: "Subscription inactive",
    detail: "You do not have any active subscriptions with us",
    status: this.statusCode,
  });
}
