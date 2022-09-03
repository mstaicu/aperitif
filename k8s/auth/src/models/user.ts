import mongoose from "mongoose";

import type { SubscriptionDoc } from "./subscription";

/**
 * describes the properties that are requried to create a new User
 */
interface UserAttrs {
  id: string;
  /**
   *
   */
  email: string;
  /**
   *
   */
  subscription?: SubscriptionDoc;
}

/**
 * describes the properties that a User Document has
 */
interface UserDoc extends mongoose.Document {
  email: string;
  /**
   *
   */
  subscription?: SubscriptionDoc;
  /**
   * Refresh token rotation and reuse detection
   */
  refreshTokens: String[];
}

/**
 * describes the properties that a User Model has
 */
interface UserModel extends mongoose.Model<UserDoc> {
  build(attrs: UserAttrs): UserDoc;
}

const userSchema = new mongoose.Schema(
  {
    /**
     * Mapping Stripe Customers IDs to internal User IDs
     */
    _id: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      /**
       * https://mongoosejs.com/docs/populate.html#populate
       */
      ref: "Subscription",
    },
    refreshTokens: {
      type: [String],
      default: [],
    },
  },
  {
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id;

        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

userSchema.statics.build = ({ id, ...rest }: UserAttrs) =>
  new User({ _id: id, ...rest });

const User = mongoose.model<UserDoc, UserModel>("User", userSchema);

export { User };
