import bodyParser from "body-parser";
import compression from "compression"; // compresses requests
import dotenv from "dotenv";
import express from "express";
import lusca from "lusca";
import mongoose from "mongoose";
import { MONGODB_URI } from "./utils/secrets";

import * as authController from "./controllers/auth.controller";

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

app.post("/login", authController.postLogin);
app.post("/signup", authController.postSignup);
app.post("/refresh", authController.postRefresh);
app.post("/logout", authController.postLogout);

/**
 * Primary app routes.
 */

/**
 * OAuth authentication routes. (Sign in)
 */

export default app;
