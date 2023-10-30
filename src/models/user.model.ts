import dynamoose from "dynamoose";
import { schemaChat } from "./chat.model.js";

export const schemaUser = new dynamoose.Schema({
  id: { type: String, required: true, hashKey: true },
  name: { type: String, required: true },
  chats: [schemaChat],
});
