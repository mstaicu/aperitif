import { Subjects } from "./types/subjects";

export interface CustomerCreatedEvent {
  subject: Subjects.CustomerCreated;
  data: {
    id: string;
    email: string | null;
  };
}
