import dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";

import { Chat } from "../models/chat.model";
import { User } from "../models/user.model";
import { UserRequest } from "../type/express";

dotenv.config({ path: ".env" });

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { serverId } = req.query;

  const users = await User.find({ id: { $regex: `^${serverId}:` } });

  return res.status(200).json({ users });
};

export const getChats = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const { serverId } = req.query;
  const user = req.user;

  const chats = await Chat.find({ id: { $regex: `^${serverId}:` } });

  return res.status(200).json({ chats });
};
