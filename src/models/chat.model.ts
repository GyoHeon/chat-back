import mongoose from "mongoose";
import { MessageDocument } from "./message.model";

type ChatParticipant = {
  id: string;
  name: string;
  picture: string;
};

export type ChatDocument = mongoose.Document & {
  _id: mongoose.Types.ObjectId;
  id: string;
  name: string;
  isPrivate: boolean;
  users: ChatParticipant[];
  messages: MessageDocument[];
  updatedAt: Date;
  createdAt: Date;
};

export const chatSchema = new mongoose.Schema<ChatDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    users: Array,
    messages: Array,
    isPrivate: Boolean,
  },
  {
    timestamps: true,
  }
);

chatSchema.pre("save", function (next) {
  const chat = this as ChatDocument;

  chat.messages = [];

  return next();
});

export const Chat = mongoose.model<ChatDocument>("Chat", chatSchema, "Chat");
