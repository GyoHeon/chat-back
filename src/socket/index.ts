import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { Server } from "socket.io";

import { Chat } from "../models/chat.model";
import { Message } from "../models/message.model";
import {
  deletePrefixedId,
  deletePrefixedIds,
  makePrefixedId,
} from "../utils/prefix";
import { verifyToken } from "../utils/verifyToken";

import app from "../app";

export const httpServer = createServer(app);
export const io = new Server(httpServer, { cors: { origin: "*" } });

app.set("io", io);

export const chatSocket = io.of("/chat");
const serverSocket = io.of("/server");

serverSocket.use((socket, next) => {
  const rawAccessToken = socket.handshake.headers.authorization;

  const accessToken = rawAccessToken?.split(" ")[1];

  if (!accessToken) {
    return next(new Error("invalid token"));
  }

  const user = verifyToken(accessToken);
  if (!user) {
    return next(new Error("invalid user"));
  }

  socket.data.user = user;

  next(null);
});

serverSocket.on("connection", async (socket) => {
  const serverId = socket.handshake.headers.serverid as string;

  if (!serverId) {
    console.log("serverId is not exist");
    return socket.disconnect();
  }

  await socket.join([serverId, socket.data.user.id]);

  const users = [];

  for (const socketId of serverSocket.adapter.rooms.get(serverId)) {
    const user = serverSocket.sockets.get(socketId);
    const isUnique = users.every((id) => id !== user.data.user.id);
    if (isUnique) {
      users.push(user.data.user.id);
    }
  }

  const responseUser = deletePrefixedIds(users);

  serverSocket
    .to(serverId)
    .emit("users-server-to-client", { users: responseUser });

  socket.on("users-server", async () => {
    const users = [];
    for (const socketId of serverSocket.adapter.rooms.get(serverId)) {
      const user = serverSocket.sockets.get(socketId);
      const isUnique = users.every((id) => id !== user.data.user.id);
      if (isUnique) {
        users.push(user.data.user.id);
      }
    }
    const responseUser = deletePrefixedIds(users);

    serverSocket
      .to(serverId)
      .emit("users-server-to-client", { users: responseUser });
  });

  socket.on("disconnect", () => {
    if (!serverSocket.adapter.rooms.get(serverId)) {
      return;
    }
    const users = [];
    for (const socketId of serverSocket.adapter.rooms.get(serverId)) {
      const user = serverSocket.sockets.get(socketId);
      const isUnique = users.every((id) => id !== user.data.user.id);
      if (isUnique) {
        users.push(user.data.user.id);
      }
    }

    const responseUser = deletePrefixedIds(users);

    serverSocket
      .to(serverId)
      .emit("users-server-to-client", { users: responseUser });
  });
});

chatSocket.use((socket, next) => {
  const rawAccessToken = socket.handshake.headers.authorization;

  const accessToken = rawAccessToken?.split(" ")[1];

  if (!accessToken) {
    console.log("accessToken is not exist");
    return next(new Error("invalid token"));
  }

  const user = verifyToken(accessToken);
  if (!user) {
    console.log("user is not exist");
    return next(new Error("invalid user"));
  }

  socket.data.user = user;

  next(null);
});

chatSocket.on("connection", async (socket) => {
  const { chatId } = socket.handshake.query;
  const serverId = socket.handshake.headers.serverid as string;
  const user = socket.data.user;

  if (!(chatId && serverId)) {
    console.log("chatId or serverId is not exist");
    return socket.disconnect();
  }

  const prefixedChatId = makePrefixedId(chatId as string, serverId);

  if (!prefixedChatId) {
    console.log("prefixedChatId is not exist");
    return socket.disconnect();
  }

  await socket.join([prefixedChatId]);

  const chat = await Chat.findOne({ id: prefixedChatId });

  if (!chat) {
    console.log("chat is not exist", prefixedChatId);
    return socket.disconnect();
  }

  const isParticipated = chat.users.some((id) => id === user.id);
  if (!isParticipated) {
    console.log("user is not participated", chat.users);
    return socket.disconnect();
  }

  socket.on("fetch-messages", async () => {
    try {
      const chat = await Chat.findOne({ id: prefixedChatId });
      if (!chat) {
        console.log("fetch-messages fail with chatId :", prefixedChatId);
        socket.emit("error", {
          error: "fetch-messages fail with chatId :",
          prefixedChatId,
        });
        return;
      }
      const rawMessages = chat.messages;
      if (!rawMessages) {
        return socket.emit("messages-to-client", { messages: [] });
      }

      const responseMessages = rawMessages.map((message) => ({
        id: message.id,
        text: message.text,
        userId: deletePrefixedId(message.userId),
        createdAt: message.createdAt,
      }));

      socket.emit("messages-to-client", { messages: responseMessages });
    } catch (error) {
      console.log(error);
      socket.disconnect();
    }
  });

  socket.on("message-to-server", async (message) => {
    const messageId = randomUUID();
    const responseMessage = {
      id: messageId,
      text: message,
      userId: deletePrefixedId(user.id),
      createdAt: new Date(),
    };

    const messageData = new Message({
      ...responseMessage,
      userId: user.id,
    });

    try {
      await chat.updateOne({ $push: { messages: messageData } });

      chatSocket.to(prefixedChatId).emit("message-to-client", responseMessage);
    } catch (error) {
      console.log(error);
      socket.disconnect();
    }
  });

  try {
    const users = [];

    if (!chatSocket.adapter.rooms.size) {
      if (chatSocket.adapter.rooms.has(prefixedChatId)) {
        for (const socketId of chatSocket.adapter.rooms.get(prefixedChatId)) {
          const user = chatSocket.sockets.get(socketId);
          const isUnique = users.every((id) => id !== user.data.user.id);
          if (isUnique) {
            users.push(user.data.user.id);
          }
        }
        const responseUser = deletePrefixedIds(users);

        chatSocket
          .to(prefixedChatId)
          .emit("users-to-client", { users: responseUser });
      }
    }
  } catch (error) {
    console.log("first fetch", chatSocket.adapter.rooms);

    console.log(error);
  }

  socket.on("users-chat", async () => {
    try {
      if (!chatSocket.adapter.rooms.size) {
        return;
      }
      if (!chatSocket.adapter.rooms.has(prefixedChatId)) {
        return;
      }

      const users = [];

      for (const socketId of chatSocket.adapter.rooms.get(prefixedChatId)) {
        const user = chatSocket.sockets.get(socketId);
        const isUnique = users.every((id) => id !== user.data.user.id);
        if (isUnique) {
          users.push(user.data.user.id);
        }
      }

      const responseUser = deletePrefixedIds(users);

      chatSocket
        .to(prefixedChatId)
        .emit("users-to-client", { users: responseUser });
    } catch (error) {
      console.log("users-chat", chatSocket.adapter.rooms);

      console.log(error);
    }
  });

  socket.on("disconnect", () => {
    try {
      if (!chatSocket.adapter.rooms.size) {
        return;
      }
      if (!chatSocket.adapter.rooms.has(prefixedChatId)) {
        return;
      }

      const users = [];

      for (const socketId of chatSocket.adapter.rooms.get(prefixedChatId)) {
        const user = chatSocket.sockets.get(socketId);
        const isUnique = users.every((id) => id !== user.data.user.id);
        if (isUnique) {
          users.push(user.data.user.id);
        }
      }

      const responseUser = deletePrefixedIds(users);

      chatSocket
        .to(prefixedChatId)
        .emit("users-to-client", { users: responseUser });
    } catch (error) {
      console.log("disconnect", chatSocket.adapter.rooms);
      console.log(prefixedChatId);

      console.log(error);
      console.log(chatSocket.adapter.rooms instanceof Map);
    }
  });
});
