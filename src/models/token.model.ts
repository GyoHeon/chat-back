import mongoose from "mongoose";

export type TokenDocument = mongoose.Document & {
  _id: mongoose.Types.ObjectId;
  userId: string;
  token: string;
  expires: Date;
};

export const tokenSchema = new mongoose.Schema<TokenDocument>(
  {
    userId: { type: String, required: true },
    token: { type: String, required: true },
    expires: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Token = mongoose.model<TokenDocument>(
  "Token",
  tokenSchema,
  "Token"
);
