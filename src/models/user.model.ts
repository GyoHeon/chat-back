import bcrypt from "bcrypt-nodejs";
import crypto from "crypto";
import mongoose from "mongoose";
import { ChatDocument } from "./chat.model";

export type UserDocument = mongoose.Document & {
  id: string;
  password: string;
  name: string;
  picture: string;
  chats: ChatDocument[];

  tokens: AuthToken[];

  comparePassword: comparePasswordFunction;
  gravatar: () => string;
};

type comparePasswordFunction = (
  candidatePassword: string,
  cb: (err: any, isMatch: any) => void
) => void;

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

    tokens: Array,
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
  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return next(err);
    }
    bcrypt.hash(user.password, salt, undefined, (err: mongoose.Error, hash) => {
      if (err) {
        return next(err);
      }
      user.password = hash;
      next();
    });
  });
});

const comparePassword: comparePasswordFunction = function (
  candidatePassword,
  cb
) {
  bcrypt.compare(
    candidatePassword,
    this.password,
    (err: mongoose.Error, isMatch: boolean) => {
      cb(err, isMatch);
    }
  );
};

userSchema.methods.comparePassword = comparePassword;

/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function () {
  const md5 = crypto.createHash("md5").update(this.id).digest("hex");

  return `https://gravatar.com/avatar/${md5}?s=200&d=retro`;
};

export const User = mongoose.model<UserDocument>("User", userSchema);
