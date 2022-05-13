import mongoose from "mongoose";

// properties that are required to create a User document
interface UserAttrs {
  email: string;
}

// properties that a User document has
interface UserDoc extends mongoose.Document {
  email: string;
}

// properties that a User model has
interface UserModel extends mongoose.Model<UserDoc> {
  build(attrs: UserAttrs): UserDoc;
}

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
      },
      versionKey: false,
    },
  }
);

// If you move this line below the User declaration line, everything breaks
userSchema.statics.build = (attrs: UserAttrs) => new User(attrs);

const User = mongoose.model<UserDoc, UserModel>("User", userSchema);

export { User };
