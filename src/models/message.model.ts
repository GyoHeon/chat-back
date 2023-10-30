import mongoose from "mongoose";

export type MessageDocument = mongoose.Document & {
  id: string;
  text: string;
  userId: string;
  chatId: string;

  serverId: string;
};

export const messageSchema = new mongoose.Schema<MessageDocument>(
  {
    id: { type: String, required: true, unique: true },
    text: { type: String, required: true },
    userId: { type: String, required: true },
    chatId: { type: String, required: true },

    serverId: String,
  },
  { timestamps: true }
);

messageSchema.pre("save", function save(next) {
  const message = this as MessageDocument;
  if (!message.text.trim()) {
    throw new Error("Text cannot be empty");
  }
  if (message.text.length > 1000) {
    throw new Error("Text cannot be longer than 1000 characters");
  }
  return next();
});

export const Chat = mongoose.model<MessageDocument>("Message", messageSchema);
