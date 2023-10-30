import express from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const authRouter = express.Router();

authRouter.post("/signup", async (req, res, next) => {
  const { userId, name, password } = req.body;
  const user = new User(req.body);

  const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1d",
  });

  res.json({ accessToken });
});
