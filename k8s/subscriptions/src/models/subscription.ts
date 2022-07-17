import mongoose from "mongoose";

import Stripe from "stripe";

interface SubscriptionAttrs {
  stripeSubscriptionId: string;
  stripeSubscription: Stripe.Subscription;
}

interface SubscriptionDoc extends mongoose.Document {
  stripeSubscriptionId: string;
  stripeSubscription: Stripe.Subscription;
  version: number;
}

interface SubscriptionModel extends mongoose.Model<SubscriptionDoc> {
  build(attrs: SubscriptionAttrs): SubscriptionDoc;
}

const subscriptionSchema = new mongoose.Schema(
  {
    stripeSubscriptionId: {
      type: String,
      required: true,
      unique: true,
    },
    stripeSubscription: {
      /**
       * https://mongoosejs.com/docs/schematypes.html#mixed
       */
      type: mongoose.SchemaTypes.Mixed,
      required: true,
    },
  },
  {
    toJSON: {
      transform: (document, ret) => {
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

subscriptionSchema.statics.build = (attrs: SubscriptionAttrs) =>
  new Subscription(attrs);

const Subscription = mongoose.model<SubscriptionDoc, SubscriptionModel>(
  "Subscription",
  subscriptionSchema
);

export { Subscription };
