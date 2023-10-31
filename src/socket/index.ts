import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { Server } from "socket.io";

import app from "../app";
import { Chat } from "../models/chat.model";
import { Message } from "../models/message.model";
import { User } from "../models/user.model";
import { makePrefixedId } from "../utils/makePrefixedId";
import { verifyToken } from "../utils/verifyToken";

export const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.set("io", io);

const chat = io.of("/chat");

chat.use((socket, next) => {
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

chat.on("connection", async (socket) => {
  const { chatId, serverId } = socket.handshake.query;
  const user = socket.data.user;

  if (!(chatId && serverId)) {
    return;
  }

  const prefixedId = makePrefixedId(chatId as string, serverId as string);

  const chat = await Chat.findOne({ id: prefixedId });

  if (!chat) {
    return;
  }

  const isParticipated = chat.users.some((id) => id === user.id);
  if (!isParticipated) {
    return;
  }

  socket.on("message", async (message) => {
    const messageId = randomUUID();
    const messageData = new Message({
      id: messageId,
      text: message,
      userId: user.id,
      createdAt: new Date(),
    });

    console.log(message, messageData, messageId);

    try {
      await chat.updateOne({ $push: { messages: messageData } });

      socket.to(prefixedId).emit("new-message", messageData);
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("join", async () => {});
});

io.on("connection", async (socket) => {
  const userData = {
    userID: socket.id,
  };

  const user = await User.findOne(({ id: userID }) => userID === socket.id);

  if (user === undefined) {
  }

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
