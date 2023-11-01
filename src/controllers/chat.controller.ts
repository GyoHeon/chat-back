import dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

import { Chat } from "../models/chat.model";
import { User, UserDocument } from "../models/user.model";
import { UserRequest } from "../type/express";
import { deletePrefixedId } from "../utils/deletePrefixedId";
import { makePrefixedId } from "../utils/makePrefixedId";

dotenv.config({ path: ".env" });

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { serverid } = req.headers;

  const originalUsers = await User.find({ id: { $regex: `^${serverid}:` } });

  const users = originalUsers.map((user) => {
    const { id, name, picture } = user;
    const originalId = deletePrefixedId(id);
    return {
      id: originalId,
      name,
      picture,
    };
  });

  return res.status(200).json(users);
};

export const getChat = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user as UserDocument;
  const id = user.id;

  const my = await User.findOne({ id });

  const originalChats = my.chats;

  const chats = originalChats.map((chatId) => deletePrefixedId(chatId));

  if (!chats) {
    return res.status(404).json({ message: "Chat not found" });
  } else {
    return res.status(200).json({ chats });
  }
};

export const getAllChats = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const { serverid } = req.headers;

  try {
    const chats = await Chat.find({
      id: { $regex: `^${serverid}:` },
      isPrivate: false,
    });

    const pickChats = chats
      .map((chat) => {
        const { id, name, users, isPrivate, updatedAt } = chat;
        const originalId = deletePrefixedId(id);
        const originalUsers = users.map((user) => deletePrefixedId(user));
        return {
          id: originalId,
          name,
          users: originalUsers,
          isPrivate,
          updatedAt,
        };
      })
      .filter((chat) => !chat.isPrivate);
    return res.status(200).json({ chats: pickChats });
  } catch (err) {
    return res.status(500).json({ err });
  }
};

export const postChat = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const { serverid } = req.headers;
  const { name, users, isPrivate = false } = req.body;

  const id = randomUUID();
  const prefixId = makePrefixedId(id, serverid as string);

  const user = req.user as UserDocument;
  const prefixedUsers = users.map((id: string) =>
    makePrefixedId(id, serverid as string)
  );
  const allUsers = [...prefixedUsers, user.id];

  const chat = new Chat({
    id: prefixId,
    name,
    users: allUsers,
    isPrivate,
  });

  try {
    const userModels = await User.find({ id: { $in: allUsers } });

    if (!userModels) {
      return res.status(404).json({ message: "User not found" });
    }

    await chat.save();

    await Promise.all(
      userModels.map((user) => {
        user.chats.push(chat.id);
        user.save();
      })
    );

    return res.status(200).json({ chat });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal Server Error with chat creation" });
  }
};

export const updateParticipate = async (req: UserRequest, res: Response) => {
  const { serverid } = req.headers;
  const { chatId } = req.body;
  const user = req.user as UserDocument;

  const prefixedChatId = makePrefixedId(chatId, serverid as string);

  try {
    const chat = await Chat.findOne({ id: prefixedChatId });

    const existingUser = chat.users.find((id) => id === user.id);
    if (existingUser) {
      return res.status(400).json({ message: "Already participated" });
    }
    chat.users.push(user.id);

    await chat.save();

    req.app.get("io").of("/chat").to(prefixedChatId).emit("participate", {
      user,
    });

    res.status(200).json({ message: "Success" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
