import mongoose from "mongoose";

import { Password } from "../services/password";

// properties that are required to create a User document
interface UserAttrs {
  email: string;
  password: string;
}

// properties that a User document has
interface UserDoc extends mongoose.Document {
  email: string;
  password: string;
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
    password: {
      type: String,
      required: true,
    },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;

        delete ret._id;
        delete ret.password;
      },
      versionKey: false,
    },
  }
);

userSchema.pre("save", async function (done) {
  // 'this' referrs to the current User document

  // This is to check if we retrieve the user from the db and then save it again
  // When creating a User document for the first time, isModified will return true
  if (this.isModified("password")) {
    const hashed = await Password.toHash(this.get("password"));
    this.set("password", hashed);
  }

  done();
});

// If you move this line below the User declaration line, everything breaks
userSchema.statics.build = (attrs: UserAttrs) => new User(attrs);

const User = mongoose.model<UserDoc, UserModel>("User", userSchema);

export { User };
