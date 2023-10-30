import dynamoose from "dynamoose";

import { schemaUser } from "./user.model.js";

export const schemaChat = new dynamoose.Schema(
  {
    id: { type: String, required: true, hashKey: true },
    name: { type: String, required: true },
    users: [schemaUser],
  },
  {
    timestamps: {
      createdAt: ["createdAt", "creation"],
      updatedAt: ["updatedAt", "updated"],
    },
  }
);
