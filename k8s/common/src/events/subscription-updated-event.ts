import { Subjects } from "./types/subjects";

export interface SubscriptionUpdatedEvent {
  subject: Subjects.SubscriptionUpdated;
  data: {
    id: string;
    version: number;
    // TODO: See what data we need to replicate
  };
}
