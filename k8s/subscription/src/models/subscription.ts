import mongoose from "mongoose";

import type Stripe from "stripe";

interface SubscriptionAttrs {
  id: string;
  cancel_at: number | null;
  cancel_at_period_end: boolean;
  current_period_end: number;
  customerId: string;
  status: Stripe.Subscription.Status;
}

interface SubscriptionDoc extends mongoose.Document {
  cancel_at: number | null;
  cancel_at_period_end: boolean;
  current_period_end: number;
  customerId: string;
  status: Stripe.Subscription.Status;
  version: number;
}

interface SubscriptionModel extends mongoose.Model<SubscriptionDoc> {
  build(attrs: SubscriptionAttrs): SubscriptionDoc;
}

let subscriptionSchema = new mongoose.Schema(
  {
    /**
     * Lets hope this is a good idea, mapping Stripe Subscription IDs to internal Subscription IDs
     */
    _id: {
      type: String,
      required: true,
    },
    cancel_at_period_end: {
      type: Boolean,
      required: true,
    },
    cancel_at: {
      type: Number,
    },
    current_period_end: {
      type: Number,
    },
    customerId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
  },
  {
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

subscriptionSchema.set("versionKey", "version");

/**
 * Optimistic concurrency control
 *
 * https://github.com/eoin-obrien/mongoose-update-if-current/blob/master/src/version-occ-plugin.js
 */
subscriptionSchema.pre("save", function (next) {
  this.$where = {
    ...this.$where,
    version: this.get("version"),
  };

  this.increment();

  next();

  /**
   * In order for us to manage the version:
   * 
   * 1. Update the pre save hook to:
   * 
   * this.$where = {
       ...this.$where,
       version: this["version"] - 1, // Depending on the version semantics, if we go in increments of 1, or 100, substract by that
     };

     // Remove the this.increment() call

     2. When we wish to update our replicated documents, include the 'version' provided with the event:

     ticket.set({
        title,
        price,
        version,
      });

      This will now:
      
      1. set the version on the document
      2. submit an update query to mongo for a document with the document's id and the document's version set to the version value - 1

     This will now no longer rely on the this.increment built in, because we may want to increment by 100, or 1000 our versions
   */
});

subscriptionSchema.statics.build = ({ id, ...rest }: SubscriptionAttrs) =>
  new Subscription({ _id: id, ...rest });

let Subscription = mongoose.model<SubscriptionDoc, SubscriptionModel>(
  "Subscription",
  subscriptionSchema
);

export { Subscription };
