import mongoose from "mongoose";

interface PaymentAttrs {
  orderId: string;
  stripeChargeId: string;
}

interface PaymentDoc extends mongoose.Document {
  orderId: string;
  stripeChargeId: string;
  version: number;
}

interface PaymentModel extends mongoose.Model<PaymentDoc> {
  build(attrs: PaymentAttrs): PaymentDoc;
}

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
    },
    stripeChargeId: {
      type: String,
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

paymentSchema.set("versionKey", "version");

/**
 * Optimistic concurrency control
 */
paymentSchema.pre("save", function (next) {
  this.$where = {
    ...this.$where,
    version: this["version"],
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

paymentSchema.statics.build = (attrs: PaymentAttrs) => new Payment(attrs);

const Payment = mongoose.model<PaymentDoc, PaymentModel>(
  "Payment",
  paymentSchema
);

export { Payment };
