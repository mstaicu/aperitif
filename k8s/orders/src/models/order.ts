import mongoose from "mongoose";

import { OrderStatus } from "@tartine/common";

import type { TicketDoc } from "./ticket";

// properties that are required to create a Order document
interface OrderAttrs {
  userId: string;
  status: OrderStatus;
  expiresAt: Date;
  //
  ticket: TicketDoc;
}

// properties that a Order document has
interface OrderDoc extends mongoose.Document {
  userId: string;
  status: OrderStatus;
  expiresAt: Date;
  version: number;
  //
  ticket: TicketDoc;
}

// properties that a Order model has
interface OrderModel extends mongoose.Model<OrderDoc> {
  build(attrs: OrderAttrs): OrderDoc;
}

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(OrderStatus),
      default: OrderStatus.Created,
    },
    expiresAt: {
      type: mongoose.Schema.Types.Date,
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      /**
       * Ref / population feature
       */
      ref: "Ticket",
    },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
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
    version: this["version"],
  };

  this.increment();

  next();

  /**
   * If we want to switch to us managing the version, we would .set({version}) before updating a document and then:
   * 
   * this.$where = {
       ...this.$where,
       version: this["version"] - 1,
     };

     next();

     This will now no longer rely on the this.increment built in, because we may want to increment by 100, or 1000 our versions
   */
});

// If you move this line below the User declaration line, everything breaks
orderSchema.statics.build = (attrs: OrderAttrs) => new Order(attrs);

const Order = mongoose.model<OrderDoc, OrderModel>("Order", orderSchema);

export { Order, OrderStatus };
