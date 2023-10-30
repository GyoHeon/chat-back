import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.use((socket, next) => {
  const username = socket.handshake.auth.username;
  const userID = socket.handshake.auth.userID;
  if (!(username && userID)) {
    return next(new Error("invalid user"));
  }

  next();
});

let users = [];
io.on("connection", (socket) => {
  const userData = {
    userID: socket.id,
  };

  const user = users.find(({ userID }) => userID === socket.id);

  if (user === undefined) {
    users.push(userData);
  }

  io.emit("users-data", { users });

  // message from client
  socket.on("message-to-server", (payload) => {});

  // exit chat
  socket.on("disconnect", () => {});

  // import message from database
  socket.on("fetch-messages", ({ receiver }) => {});

  socket.on("stored-messages", ({ messages }) => {});
});

const PORT = 4000;

app.use(express.json());
app.use(express.urlencoded());

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.post("/session", (req, res) => {
  const data = {};

  res.send(data);
});
