import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { Server } from "socket.io";

import app from "../app";
import { Chat } from "../models/chat.model";
import { Message } from "../models/message.model";
import { User } from "../models/user.model";
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
  const { roomId, serverId } = socket.handshake.query;
  const user = socket.data.user;

  console.log(roomId, serverId);

  if (!(roomId && serverId)) {
    return;
  }

  const chat = await Chat.findOne({ id: roomId });

  if (!chat) {
    return;
  }

  socket.on("message", async (message) => {
    const messageId = randomUUID();
    const messageData = new Message({
      id: messageId,
      text: message,
      userId: user.id,
    });

    console.log(message, messageData, messageId);

    try {
      chat.messages.push(messageData);

      console.log("before", chat);

      await chat.save();

      console.log("after", chat);

      socket.to(roomId).emit("message", messageData);
    } catch (error) {
      console.log(error);
    }
  });
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
