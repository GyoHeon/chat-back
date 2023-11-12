import dotenv from "dotenv";
import { Response } from "express";

import { Chat } from "../models/chat.model";
import { User } from "../models/user.model";
import { UserRequest } from "../type/express";

dotenv.config({ path: ".env" });

export const deleteAllChatAndUsers = async (
  req: UserRequest,
  res: Response
) => {
  const serverId = req.headers.serverid as string;

  try {
    await Chat.deleteMany({ id: { $regex: `^${serverId}:` } });

    await User.deleteMany({ id: { $regex: `^${serverId}:` } });

    res.status(200).json({ message: "Delete success" });
  } catch (error) {
    console.warn(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteChatOnly = async (req: UserRequest, res: Response) => {
  const serverId = req.headers.serverid as string;

  try {
    await Chat.deleteMany({ id: { $regex: `^${serverId}:` } });

    const allUsers = await User.find({ id: { $regex: `^${serverId}:` } });

    allUsers.forEach(async (user) => {
      await user.updateOne({ $set: { chats: [] } });
    });

    res.status(200).json({ message: "Delete success" });
  } catch (error) {
    console.warn(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
