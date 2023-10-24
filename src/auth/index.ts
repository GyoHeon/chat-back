import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";

dotenv.config({ path: "../../env" });

const app = express();

app.use(express.json());
app.use(cookieParser());

//make express auth app

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = { username, password };

  const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });

  res.json({ accessToken });
});
