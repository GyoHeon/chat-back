import { randomUUID } from "node:crypto";

import { chatSocket } from ".";
import { Chat } from "../models/chat.model";
import { Message } from "../models/message.model";
import { deletePrefixedId, deletePrefixedIds } from "../utils/deletePrefixedId";
import { makePrefixedId } from "../utils/makePrefixedId";
import { verifyToken } from "../utils/verifyToken";

chatSocket.use((socket, next) => {
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

chatSocket.on("connection", async (socket) => {
  const { chatId } = socket.handshake.query;
  const serverId = socket.handshake.headers.serverid as string;
  const user = socket.data.user;

  if (!(chatId && serverId)) {
    return socket.disconnect();
  }

  const prefixedChatId = makePrefixedId(chatId as string, serverId);

  if (!prefixedChatId) {
    return socket.disconnect();
  }
  socket.join([prefixedChatId]);


  const chat = await Chat.findOne({ id: prefixedChatId });

  if (!chat) {
    return socket.disconnect();
  }

  const isParticipated = chat.users.some((id) => id === user.id);
  if (!isParticipated) {
    return socket.disconnect();
  }

  socket.on("fetch-messages", async () => {
    try {
      const chat = await Chat.findOne({ id: prefixedChatId });
      const messages = chat.messages.reverse();
      if (!messages) {
        return socket.emit("messages-to-client", { messages: [] });
      }
      socket.emit("messages-to-client", { messages });
    } catch (error) {
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
      const chat = await Chat.findOne({ id: prefixedChatId });

      await chat.updateOne({ $push: { messages: messageData } });

      chatSocket.to(prefixedChatId).emit("message-to-client", responseMessage);
    } catch (error) {
      socket.disconnect();
    }
  });

  let users = [];
  for (const [_, user] of chatSocket.sockets) {
    users.push(user.data.user.id);
    users = [...new Set(...users)];
  }

  const responseUser = deletePrefixedIds(users);

  chatSocket
    .to(prefixedChatId)
    .emit("users-to-client", { users: responseUser });

  socket.on("users-chat", async () => {
    const responseUser = deletePrefixedIds(users);

    chatSocket
      .to(prefixedChatId)
      .emit("users-chat-to-client", { users: responseUser });
  });

  socket.on("disconnect", () => {
    users = users.filter((id) => id !== user.id);
    const responseUser = deletePrefixedIds(users);

    chatSocket
      .to(prefixedChatId)
      .emit("users-chat-to-client", { users: responseUser });
  });
});
