import { Publisher, ExpirationCompleteEvent, Subjects } from "@tartine/common";

export class ExpirationCompletePublisher extends Publisher<ExpirationCompleteEvent> {
  readonly subject = Subjects.ExpirationComplete;
}
