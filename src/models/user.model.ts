import bcrypt from "bcrypt";
import crypto from "crypto";
import mongoose from "mongoose";
import {
  comparePassword,
  comparePasswordFunction,
} from "../utils/comparePassword";

export type UserDocument = mongoose.Document & {
  _id: mongoose.Types.ObjectId;
  id: string;
  password: string;
  name: string;
  picture: string;
  chats: string[];

  comparePassword: comparePasswordFunction;
  gravatar: () => string;
};

export interface AuthToken {
  accessToken: string;
  kind: string;
}

export const userSchema = new mongoose.Schema<UserDocument>(
  {
    id: { type: String, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    picture: String,
    chats: Array,
  },
  { timestamps: true }
);

/**
 * Password hash middleware.
 */
userSchema.pre("save", function save(next) {
  const user = this as UserDocument;
  if (!user.isModified("password")) {
    return next();
  }
  user.chats = [];
  user.picture = user.gravatar();
  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return next(err);
    }
    bcrypt.hash(user.password, salt, (err: mongoose.Error, hash) => {
      if (err) {
        return next(err);
      }
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = comparePassword;

/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function () {
  const md5 = crypto.createHash("md5").update(this.id).digest("hex");

  return `https://gravatar.com/avatar/${md5}?s=200&d=retro`;
};

export const User = mongoose.model<UserDocument>("User", userSchema, "User");
