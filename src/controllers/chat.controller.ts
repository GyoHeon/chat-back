import dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

import { Chat } from "../models/chat.model";
import { User, UserDocument } from "../models/user.model";
import { UserRequest } from "../type/express";
import { makePrefixedId } from "../utils/makePrefixedId";

dotenv.config({ path: ".env" });

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { serverid } = req.headers;

  const users = await User.find({ id: { $regex: `^${serverid}:` } });

  return res.status(200).json({ users });
};

export const getChat = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user as UserDocument;
  const id = user.id;

  const my = await User.findOne({ id });

  const chats = my.chats;

  if (!chats) {
    return res.status(404).json({ message: "Chat not found" });
  }

  return res.status(200).json({ chats });
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

    const pickChats = chats.map((chat) => {
      const { id, name, users, isPrivate, updatedAt } = chat;
      return { id, name, users, isPrivate, updatedAt };
    });
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

  const id = uuidv4();
  const prefixId = makePrefixedId(id, serverid as string);

  const user = req.user as UserDocument;
  const prefixedUses = users.map((id) =>
    makePrefixedId(id, serverid as string)
  );
  const allUsers = [...prefixedUses, user.id];

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
