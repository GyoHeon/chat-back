import dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

import { Chat } from "../models/chat.model";
import { User } from "../models/user.model";
import { UserRequest } from "../type/express";
import { deletePrefixedId } from "../utils/deletePrefixedId";
import { makePrefixedId } from "../utils/makePrefixedId";
import { verifyToken } from "../utils/verifyToken";

dotenv.config({ path: ".env" });

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { serverid, authorization } = req.headers;
  const accessToken = authorization?.split(" ")[1];
  if (!accessToken) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const user = verifyToken(accessToken);
  if (!user) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  try {
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
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getChat = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;

  const id = user.id;

  try {
    const my = await User.findOne({ id });

    const originalChats = my.chats;

    const chats = originalChats.map((chatId) => deletePrefixedId(chatId));

    if (!chats) {
      return res.status(404).json({ message: "Chat not found" });
    } else {
      return res.status(200).json({ chats });
    }
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
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

    if (!chats) {
      return res.status(404).json({ message: "Chat not found" });
    }

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
  const { serverid, authorization } = req.headers;
  const accessToken = authorization?.split(" ")[1];
  if (!accessToken) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const user = verifyToken(accessToken);
  if (!user) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { name, users, isPrivate = false } = req.body;

  const id = randomUUID();
  const prefixId = makePrefixedId(id, serverid as string);

  const prefixedUsers = users.map((id: string) =>
    makePrefixedId(id, serverid as string)
  );
  const allUsers = [...prefixedUsers, user.id];

  const originalUsers = allUsers.map((user) => deletePrefixedId(user));

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

    const responseChat = {
      id: deletePrefixedId(chat.id),
      name: chat.name,
      users: originalUsers,
      isPrivate: chat.isPrivate,
      updatedAt: chat.updatedAt,
    };

    if (!chat.isPrivate) {
      req.app.get("io").of("/chat").to(serverid).emit("new-chat", {
        responseChat,
      });
    }

    return res.status(200).json(responseChat);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal Server Error with chat creation" });
  }
};

export const updateParticipate = async (req: UserRequest, res: Response) => {
  const { serverid, authorization } = req.headers;
  const { chatId } = req.body;

  const accessToken = authorization?.split(" ")[1];
  if (!accessToken) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const user = verifyToken(accessToken);
  if (!user) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const prefixedChatId = makePrefixedId(chatId, serverid as string);

  try {
    const chat = await Chat.findOne({ id: prefixedChatId });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const existingUser = chat.users.find((id) => id === user.id);
    if (existingUser) {
      return res.status(400).json({ message: "Already participated" });
    }
    await chat.updateOne({ $push: { users: user.id } });
    const my = await User.findOne({ id: user.id });
    my.chats.push(chat.id);

    await chat.save();
    await my.save();

    const allUsers = [user.id, ...chat.users].map((id) => deletePrefixedId(id));

    req.app
      .get("io")
      .of("/chat")
      .to(prefixedChatId)
      .emit("join", {
        users: allUsers,
        joiners: [user],
      });

    const responseChat = {
      id: deletePrefixedId(chat.id),
      name: chat.name,
      users: allUsers,
      isPrivate: chat.isPrivate,
      updatedAt: chat.updatedAt,
    };

    res.status(200).json(responseChat);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const inviteParticipate = async (req: UserRequest, res: Response) => {
  const { serverid, authorization } = req.headers;
  const { chatId, users } = req.body;

  const accessToken = authorization?.split(" ")[1];
  if (!accessToken) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const user = verifyToken(accessToken);
  if (!user) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const prefixedChatId = makePrefixedId(chatId, serverid as string);
  const prefixedUsers = users.map((id: string) =>
    makePrefixedId(id, serverid as string)
  );

  try {
    const chat = await Chat.findOne({ id: prefixedChatId });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const existingUser = chat.users.find((id) => id === user.id);
    if (!existingUser) {
      return res.status(400).json({ message: "Not my chat" });
    }

    const validUsers = await Promise.all(
      prefixedUsers.map(async (id: string) => {
        const realUser = await User.findOne({ id });
        if (!realUser) {
          return false;
        }
        return true;
      })
    );
    const allValid = validUsers.every((valid) => valid);
    if (!allValid) {
      return res.status(404).json({ message: "User not found" });
    }
    const usersFromDb = await User.find({ id: { $in: prefixedUsers } });

    for (let user of usersFromDb) {
      const existingUser = chat.users.find((id) => id === user.id);
      if (existingUser) {
        return res.status(400).json({
          message: "Already participated user :" + deletePrefixedId(user.id),
        });
      }
    }

    await Promise.all(
      usersFromDb.map(async (user) => {
        await user.updateOne({ $push: { chats: chat.id } });
        await chat.updateOne({ $push: { users: user.id } });
      })
    );

    const allUsers = [
      ...chat.users.map((id) => deletePrefixedId(id)),
      ...users,
    ];

    const responseChat = {
      id: deletePrefixedId(chat.id),
      name: chat.name,
      users: allUsers,
      isPrivate: chat.isPrivate,
      updatedAt: chat.updatedAt,
    };

    req.app.get("io").of("/chat").to(prefixedChatId).emit("join", {
      users: allUsers,
      joiners: users,
    });

    res.status(200).json(responseChat);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const leaveChat = async (req: UserRequest, res: Response) => {
  const { serverid, authorization } = req.headers;
  const { chatId } = req.body;

  const accessToken = authorization?.split(" ")[1];
  if (!accessToken) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  const user = verifyToken(accessToken);
  if (!user) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const prefixedChatId = makePrefixedId(chatId, serverid as string);

  try {
    const chat = await Chat.findOne({ id: prefixedChatId });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const existingUser = chat.users.find((id) => id === user.id);
    if (!existingUser) {
      return res.status(400).json({ message: "Not my chat" });
    }
    const userFromDb = await User.findOne({ id: user.id });
    if (!userFromDb) {
      return res.status(404).json({ message: "User not found" });
    }

    await chat.updateOne({ $pull: { users: user.id } });
    await userFromDb.updateOne({ $pull: { chats: chat.id } });

    const allUsers = chat.users
      .filter((id) => id !== user.id)
      .map((id) => deletePrefixedId(id));

    req.app
      .get("io")
      .of("/chat")
      .to(prefixedChatId)
      .emit("leave", {
        users: allUsers,
        leaver: deletePrefixedId(user.id),
      });

    res.status(200).json({ message: "Leave success" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
