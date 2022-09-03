import mongoose from "mongoose";

// This interface will list out all the properties that are required to create a Ticket document
interface TicketAttrs {
  userId: string;

  title: string;
  price: number;
}

// This interface will list out all the properties that an instance of a Ticket document has
interface TicketDoc extends mongoose.Document {
  userId: string;

  orderId?: string;

  title: string;
  price: number;

  version: number;
}

interface TicketModel extends mongoose.Model<TicketDoc> {
  build(attrs: TicketAttrs): TicketDoc;
}

const ticketSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    orderId: {
      type: String,
    },
    title: {
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
      transform: (_, ret) => {
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

// If you move this line below the Ticket declaration line, everything breaks
ticketSchema.statics.build = (attrs: TicketAttrs) => new Ticket(attrs);

const Ticket = mongoose.model<TicketDoc, TicketModel>("Ticket", ticketSchema);

export { Ticket };
