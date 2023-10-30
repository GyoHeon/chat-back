import bodyParser from "body-parser";
import compression from "compression"; // compresses requests
import express from "express";
import flash from "express-flash";
import lusca from "lusca";
import mongoose from "mongoose";
import passport from "passport";
import { MONGODB_URI } from "./utils/secrets";

// Controllers (route handlers)

// API keys and Passport configuration

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

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

/**
 * Primary app routes.
 */

/**
 * OAuth authentication routes. (Sign in)
 */

export default app;
