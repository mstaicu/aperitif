import mongoose from "mongoose";

import { Order, OrderStatus } from "./order";

// properties that are required to create a Ticket document
interface TicketAttrs {
  id: string;
  title: string;
  price: number;
}

// properties that a Ticket document has
export interface TicketDoc extends mongoose.Document {
  title: string;
  price: number;
  version: number;
  isReserved(): Promise<boolean>;
}

// properties that a Ticket model has
interface TicketModel extends mongoose.Model<TicketDoc> {
  build(attrs: TicketAttrs): TicketDoc;
  findByEvent(event: {
    id: string;
    version: number;
  }): Promise<TicketDoc | null>;
}

const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
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

ticketSchema.set("versionKey", "version");

/**
 * Optimistic concurrency control
 */
ticketSchema.pre("save", function (next) {
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

/**
 * 'statics' adds method to the model, i.e. Ticket.build
 *
 * The model gives us access to the overall collection
 */
ticketSchema.statics.build = ({ id, ...rest }: TicketAttrs) =>
  new Ticket({ _id: id, ...rest });

/**
 * Optimistic concurrency control
 */
ticketSchema.statics.findByEvent = (event: { id: string; version: number }) =>
  Ticket.findOne({
    _id: event.id,
    version: event.version - 1,
  });

/**
 * 'methods' add method to the documents, i.e. the query return objects
 */

/**
 * A ticket is reserved if:
 *
 * 1. The Ticket document is associated with an order
 * 2. The order has a 'status' other than 'cancelled'
 */
ticketSchema.methods.isReserved = async function () {
  /**
   * 'this' is the ticket document we just called 'isReserved' on
   */

  const hasOrderForTicket = await Order.findOne({
    /**
     * If we use 'this' here we get a TS error. To fix this:
     *
     * 1. Use the TicketDoc as an interface to the new mongoose.Schema
     * 2. Pass the ticket id instead of ticket ( ticket: this.id )
     * 3. ticket: this as any
     * 4. ticket: this as TicketDoc
     */

    ticket: this,
    status: {
      $in: [
        OrderStatus.Created ||
          OrderStatus.AwaitingPayment ||
          OrderStatus.Complete,
      ],
    },
  });

  return !!hasOrderForTicket;
};

const Ticket = mongoose.model<TicketDoc, TicketModel>("Ticket", ticketSchema);

export { Ticket };
