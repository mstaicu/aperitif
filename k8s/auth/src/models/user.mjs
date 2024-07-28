// @ts-check
import { Schema } from "mongoose";

import { authDbConnection } from "../services/index.mjs";

var SubscriptionSchema = new Schema({
  active: Boolean,
});

var UserSchema = new Schema(
  {
    email: {
      type: {
        type: String,
        /**
         * var user = new User({email: undefined});
         * var validationResult = user.validateSync()
         *
         * var { message } = validationResult.errors.email;
         *
         * user.validate(validationResult => {})
         */
        validate: {
          validator: (email) => email.includes("@"),
          message: "Email must be valid",
        },
        required: [true, "Email is required."],
      },
    },
    devices: {
      type: [],
      default: [],
    },
    /**
     * We only create mongoose models to correspond to a collection of records inside of our db
     *
     * Embedding a resource inside another one is called sub-documenting
     * If a user is a document that has posts, those posts are subdocuments
     * 
     * If you remove a sub document, you have to save the document
     * 
     * var u = user;
     * var [firstSub] = user.subscriptions;
     * firstSub.remove()
     * u.save();
     * 
     * OR using refs. The string value passed in the ref has to be the same as 
     * the first value passed to the modal creation
     * 
     * for example: authDbConnection.model("user", UserSchema) -> 'user'
     * 
     * an array specifies a one to many, a user can have many subscriptions
     * 
     * subscriptions: [{
     *   type: Schema.Types.ObjectId,
     *   ref: 'Subscription'
     * }]
     * 
     * We're not embedding sub documents, we're passing a reference to another model
     */
    subscriptions: [SubscriptionSchema],
  },
  {
    optimisticConcurrency: true,
    versionKey: "version",
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

/**
 * The 'user' argument defines the name of the collection
 *
 * This model represents the entire collection of 'user'
 */
var User = authDbConnection.model("user", UserSchema);

export { User };
