import bodyParser from "body-parser";
import compression from "compression"; // compresses requests
import cors from "cors";
import dotenv from "dotenv";
import express, { Response } from "express";
import lusca from "lusca";
import mongoose from "mongoose";
import { MONGODB_URI } from "./utils/secrets";

// Controllers (route handlers)
import * as authController from "./controllers/auth.controller";
import * as chatController from "./controllers/chat.controller";
import { authMiddleware } from "./middleware/auth";

dotenv.config({ path: ".env" });

// Create Express server
const app = express();

// Connect to MongoDB
const mongoUrl = MONGODB_URI;

mongoose
  .connect(mongoUrl)
  .then(() => {
    /** ready to use. The `mongoose.connect()` promise resolves to undefined. */
  })
  .catch((err) => {
    console.log(
      `MongoDB connection error. Please make sure MongoDB is running. ${err}`
    );
    // process.exit();
  });

// Express configuration
app.set("port", process.env.PORT || 3000);
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(lusca.xssProtection(true));
app.use(cors());

// Auth routes. (Sign in)
app.post("/login", authController.postLogin);
app.post("/signup", authController.postSignup);
app.post("/refresh", authController.postRefresh);
app.patch("/user", authMiddleware, authController.patchUser);
app.get("/user", authMiddleware, authController.getUser);
app.get("/auth/me", authController.authMe);

// Chat routes.
app.get("/users", authMiddleware, chatController.getUsers);
app.get("/chat", authMiddleware, chatController.getChat);
app.post("/chat", authMiddleware, chatController.postChat);
app.get("/chat/all", chatController.getAllChats);
app.patch(
  "/chat/participate",
  authMiddleware,
  chatController.updateParticipate
);
app.patch("/chat/invite", authMiddleware, chatController.inviteParticipate);
app.patch("/chat/leave", authMiddleware, chatController.leaveChat);

app.get("/health", (_, res: Response) =>
  res.status(200).send("Health check OK")
);

export default app;
