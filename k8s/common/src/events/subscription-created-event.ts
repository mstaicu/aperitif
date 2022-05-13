import { Subjects } from "./types/subjects";

export interface SubscriptionCreatedEvent {
  subject: Subjects.SubscriptionCreated;
  data: {
    id: string;
    version: number;
    // TODO: See what data we need to replicate
  };
}
