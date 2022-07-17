import mongoose from "mongoose";

import { OrderStatus } from "@tartine/common";

/**
 * properties required to create an Order document
 */
interface OrderAttrs {
  id: string;
  status: OrderStatus;
  version: number;
  userId: string;
  price: number;
}

/**
 * properties an Order document has
 */
interface OrderDoc extends mongoose.Document {
  status: OrderStatus;
  version: number;
  userId: string;
  price: number;
}

/**
 * properties an Order model has
 */
interface OrderModel extends mongoose.Model<OrderDoc> {
  build(attrs: OrderAttrs): OrderDoc;
  findByEvent(event: { id: string; version: number }): Promise<OrderDoc | null>;
}

const orderSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: Object.values(OrderStatus),
    },
    userId: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
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

orderSchema.set("versionKey", "version");

/**
 * Optimistic concurrency control
 */
orderSchema.pre("save", function (next) {
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

// If you move this line below the User declaration line, everything breaks
orderSchema.statics.build = ({ id, ...rest }: OrderAttrs) =>
  new Order({
    _id: id,
    ...rest,
  });
orderSchema.statics.findByEvent = (event: { id: string; version: number }) =>
  Order.findOne({
    _id: event.id,
    version: event.version - 1,
  });

const Order = mongoose.model<OrderDoc, OrderModel>("Order", orderSchema);

export { Order, OrderStatus };
