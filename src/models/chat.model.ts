import bcrypt from "bcrypt-nodejs";
import mongoose from "mongoose";
import { MessageDocument } from "./message.model";

type ChatParticipant = {
  id: string;
  name: string;
  picture: string;
};

export type ChatDocument = mongoose.Document & {
  id: string;
  name: string;
  isPrivate: boolean;
  users: ChatParticipant[];
  messages: MessageDocument[];

  serverId: string;
};

export const chatSchema = new mongoose.Schema<ChatDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    users: Array,
    isPrivate: Boolean,

    serverId: String,
  },
  { timestamps: true }
);

chatSchema.pre("save", function save(next) {
  const user = this as ChatDocument;
  if (!user.isModified("password")) {
    return next();
  }
  bcrypt.hash(user.id, undefined, (err: mongoose.Error, hash) => {
    if (err) {
      return next(err);
    }
    user.id = hash;
    next();
  });
});

export const Chat = mongoose.model<ChatDocument>("Chat", chatSchema);
