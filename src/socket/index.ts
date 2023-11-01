import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { Server } from "socket.io";

import app from "../app";
import { Chat } from "../models/chat.model";
import { Message } from "../models/message.model";
import { makePrefixedId } from "../utils/makePrefixedId";
import { verifyToken } from "../utils/verifyToken";

export const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.set("io", io);

const chatSocket = io.of("/chat");

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
  const serverId = socket.handshake.headers.serverid;
  const user = socket.data.user;

  if (!(chatId && serverId)) {
    return socket.disconnect();
  }

  const prefixedId = makePrefixedId(chatId as string, serverId as string);

  if (!prefixedId) {
    return socket.disconnect();
  }
  socket.join([prefixedId, serverId as string]);
  console.log(socket.rooms);

  const chat = await Chat.findOne({ id: prefixedId });

  if (!chat) {
    return socket.disconnect();
  }

  const isParticipated = chat.users.some((id) => id === user.id);
  if (!isParticipated) {
    return socket.disconnect();
  }

  socket.on("fetch-messages", async () => {
    try {
      const chat = await Chat.findOne({ id: prefixedId });
      const messages = chat.messages;
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
    const messageData = new Message({
      id: messageId,
      text: message,
      userId: user.id,
      createdAt: new Date(),
    });

    try {
      const chat = await Chat.findOne({ id: prefixedId });

      await chat.updateOne({ $push: { messages: messageData } });

      chatSocket.to(prefixedId).emit("message-to-client", messageData);
    } catch (error) {
      socket.disconnect();
    }
  });

  socket.on("join", async () => {
    socket.to(prefixedId).emit("users", { user });
  });
  socket.on("leave", async () => {
    socket.to(prefixedId).emit("users", { user });
  });
});

io.on("connection", async (socket) => {
  // io.emit("users-data", { users });

  // message from client
  socket.on("message-to-server", (payload) => {});

  // exit chat
  socket.on("disconnect", () => {});

  // import message from database
  socket.on("fetch-messages", ({ receiver }) => {});

  socket.on("stored-messages", ({ messages }) => {});
});

app.post("/session", (req, res) => {
  const data = {};

  res.send(data);
});
