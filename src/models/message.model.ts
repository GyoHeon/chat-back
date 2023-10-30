import dynamoose from "dynamoose";
import { schemaChat } from "./chat.model.js";
import { schemaUser } from "./user.model.js";

export const schemaMessage = new dynamoose.Schema(
  {
    id: { type: String, required: true, hashKey: true },
    text: { type: String, required: true },
    user: { type: schemaUser, required: true },
    chat: { type: schemaChat, required: true },
  },
  {
    timestamps: {
      createdAt: ["createdAt", "creation"],
    },
    validate: (message: typeof schemaMessage) => {
      if (!message.user?.id) {
        throw new Error("User cannot be empty");
      }
      if (!message.chat?.id) {
        throw new Error("Chat cannot be empty");
      }
      if (message.text.length === 0) {
        throw new Error("Text cannot be empty");
      }
      if (message.text.length > 1000) {
        throw new Error("Text cannot be longer than 1000 characters");
      }

      return true;
    },
  }
);
