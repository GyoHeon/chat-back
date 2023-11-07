import { createServer } from "node:http";
import { Server } from "socket.io";
import { deletePrefixedIds } from "../utils/deletePrefixedId";
import { verifyToken } from "../utils/verifyToken";

import app from "../app";

export const httpServer = createServer(app);
export const io = new Server(httpServer, { cors: { origin: "*" } });

app.set("io", io);

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
  const user = socket.data.user;

  if (!serverId) {
    return socket.disconnect();
  }

  socket.join([serverId]);

  let users = [];
  for (const [_, user] of serverSocket.sockets) {
    users.push(user.data.user.id);
    users = [...new Set(...users)];
  }

  const responseUser = deletePrefixedIds(users);

  serverSocket
    .to(serverId)
    .emit("users-server-to-client", { users: responseUser });

  socket.on("users-chat", async () => {
    const responseUser = deletePrefixedIds(users);

    serverSocket
      .to(serverId)
      .emit("users-server-to-client", { users: responseUser });
  });

  socket.on("disconnect", () => {
    users = users.filter((id) => id !== user.id);
    const responseUser = deletePrefixedIds(users);

    serverSocket
      .to(serverId)
      .emit("users-server-to-client", { users: responseUser });
  });
});
