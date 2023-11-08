import dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

import { Chat, ChatDocument } from "../models/chat.model";
import { User } from "../models/user.model";
import { UserRequest } from "../type/express";
import { chatWithUser } from "../utils/chatWithUser";
import { deletePrefixedId } from "../utils/deletePrefixedId";
import { makePrefixedId } from "../utils/makePrefixedId";

dotenv.config({ path: ".env" });

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { serverid } = req.headers;

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
  } catch (error) {
    console.warn(error);
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

    const originalChats = await Promise.all(
      my.chats.map(async (chatId) => await Chat.findOne({ id: chatId }))
    );

    const chats: ChatDocument[] = originalChats.filter((chat) => chat !== null);

    const responseChats = await Promise.all(
      chats.map(async (chat) => {
        const { id, name, users, isPrivate, updatedAt, messages } = chat;
        const responseUsers = await chatWithUser(users);
        const latestMessage = messages[messages.length - 1];
        const responseLatestMessage = latestMessage
          ? {
              id: latestMessage.id,
              text: latestMessage.text,
              createdAt: latestMessage.createdAt,
              userId: deletePrefixedId(latestMessage.userId),
            }
          : null;

        const responseChat = {
          id: deletePrefixedId(id),
          name,
          users: responseUsers,
          isPrivate,
          updatedAt,
          latestMessage: responseLatestMessage,
        };

        return responseChat;
      })
    );

    if (!responseChats) {
      return res.status(404).json({ message: "Chat not found" });
    } else {
      return res.status(200).json({ chats: responseChats });
    }
  } catch (error) {
    console.warn(error);
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
      .map(async (chat) => {
        const { id, name, users, isPrivate, updatedAt, messages } = chat;
        const originalId = deletePrefixedId(id);

        const originalUsers = await chatWithUser(users);

        const latestMessage = messages[messages.length - 1];
        const responseLatestMessage = latestMessage
          ? {
              id: latestMessage.id,
              text: latestMessage.text,
              createdAt: latestMessage.createdAt,
              userId: deletePrefixedId(latestMessage.userId),
            }
          : null;

        return {
          id: originalId,
          name,
          users: originalUsers,
          isPrivate,
          updatedAt,
          latestMessage: responseLatestMessage,
        };
      })
      .filter(async (chat) => {
        const { isPrivate } = await chat;
        return !isPrivate;
      });

    const responseChats = await Promise.all(pickChats);
    return res.status(200).json({ chats: responseChats });
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

  const user = req.user;

  const { name, users, isPrivate = false } = req.body;

  for (let userId of users) {
    if (typeof userId !== "string") {
      return res.status(400).json({ message: "User id must be string" });
    }
  }

  const id = randomUUID();
  const prefixId = makePrefixedId(id, serverid as string);

  const prefixedUsers = users.map((id: string) =>
    makePrefixedId(id, serverid as string)
  );
  const allUsers = [...prefixedUsers, user.id];

  const responseUsers = await chatWithUser(allUsers);

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
      users: responseUsers,
      isPrivate: chat.isPrivate,
      updatedAt: chat.updatedAt,
    };

    if (!chat.isPrivate) {
      req.app.get("io").of("/chat").to(serverid).emit("new-chat", {
        responseChat,
      });
    }

    return res.status(200).json(responseChat);
  } catch (error) {
    console.warn(error);
    return res
      .status(500)
      .json({ message: "Internal Server Error with chat creation" });
  }
};

export const updateParticipate = async (req: UserRequest, res: Response) => {
  const { serverid } = req.headers;
  const { chatId } = req.body;

  const user = req.user;

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

    await my.updateOne({ $push: { chats: chat.id } });

    const allUsers = [user.id, ...chat.users].map((id) => deletePrefixedId(id));
    const responseUsers = await chatWithUser([user.id, ...chat.users]);

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
      users: responseUsers,
      isPrivate: chat.isPrivate,
      updatedAt: chat.updatedAt,
    };

    res.status(200).json(responseChat);
  } catch (error) {
    console.warn(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const inviteParticipate = async (req: UserRequest, res: Response) => {
  const { serverid } = req.headers;
  const { chatId, users } = req.body;

  const user = req.user;

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
          message: "Already participated user: " + deletePrefixedId(user.id),
        });
      }
    }

    await Promise.all(
      usersFromDb.map(async (user) => {
        await user.updateOne({ $push: { chats: chat.id } });
        await chat.updateOne({ $push: { users: user.id } });
      })
    );

    const allUsers = [...chat.users, ...prefixedUsers];

    const responseUsers = await chatWithUser(allUsers);

    const responseChat = {
      id: deletePrefixedId(chat.id),
      name: chat.name,
      users: responseUsers,
      isPrivate: chat.isPrivate,
      updatedAt: chat.updatedAt,
    };

    req.app.get("io").of("/chat").to(prefixedChatId).emit("join", {
      users: allUsers,
      joiners: users,
    });

    res.status(200).json(responseChat);
  } catch (error) {
    console.warn(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const leaveChat = async (req: UserRequest, res: Response) => {
  const { serverid } = req.headers;
  const { chatId } = req.body;

  const user = req.user;

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

    if (allUsers.length === 0) {
      await chat.deleteOne();
      return res.status(200).json({ message: "Chat deleted" });
    }

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
    console.warn(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
