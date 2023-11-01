import bodyParser from "body-parser";
import compression from "compression"; // compresses requests
import cors from "cors";
import dotenv from "dotenv";
import express, { Response } from "express";
import lusca from "lusca";
import mongoose from "mongoose";
import { MONGODB_URI } from "./utils/secrets";

import * as authController from "./controllers/auth.controller";
import * as chatController from "./controllers/chat.controller";
import { authMiddleware } from "./middleware/auth";

// Controllers (route handlers)

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

app.post("/login", authController.postLogin);
app.post("/signup", authController.postSignup);
app.post("/refresh", authController.postRefresh);
app.post("/logout", authController.postLogout);
app.patch("/user", authController.patchUser);

app.get("/users", chatController.getUsers);
app.get("/chat", chatController.getChat);
app.post("/chat", chatController.postChat);
app.get("/chat/all", chatController.getAllChats);
app.patch(
  "/chat/participate",
  authMiddleware,
  chatController.updateParticipate
);

/**
 * Primary app routes.
 */

app.get("/health", (_, res: Response) => res.status(200).send("OK"));

/**
 * OAuth authentication routes. (Sign in)
 */

export default app;
