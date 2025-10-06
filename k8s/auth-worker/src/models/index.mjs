// @ts-check
import mongoose from "mongoose";

import { SubscriptionSchema } from "./Subscription.schema.mjs";

export var Subscription = mongoose.model("Subscription", SubscriptionSchema);
