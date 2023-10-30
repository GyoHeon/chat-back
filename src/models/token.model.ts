import mongoose from "mongoose";

type TokenDocument = mongoose.Document & {
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

export const Token = mongoose.model<TokenDocument>("Token", tokenSchema);
