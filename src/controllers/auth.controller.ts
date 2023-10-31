import bcrypt from "bcrypt-nodejs";
import dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";
import { check, validationResult } from "express-validator";
import { sign, verify } from "jsonwebtoken";

import { Token } from "../models/token.model";
import { User } from "../models/user.model";
import { makePrefixedId } from "../utils/makePrefixedId";

dotenv.config({ path: ".env" });

export const postSignup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  await check("password", "Password must be at least 5 characters long")
    .isLength({ min: 5 })
    .run(req);
  await check("name", "Name cannot be blank").isLength({ min: 1 }).run(req);
  await check("id", "Id cannot be blank").notEmpty().run(req);
  await check("id", "Id only alphabetic and numbers")
    .matches(/^[a-zA-Z0-9]+$/)
    .run(req);
  await check("serverId", "ServerId cannot be blank").notEmpty().run(req);

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(401).json({ message: errors });
  }

  const { id, serverId, password, name } = req.body;

  const prefixedId = makePrefixedId(id, serverId);

  const user = new User({
    id: prefixedId,
    name,
    password,
  });

  try {
    const existingUser = await User.findOne({ id: prefixedId });

    if (existingUser) {
      res
        .status(401)
        .json({ message: "Account with that id address already exists." });
    }

    try {
      await user.save();
      res.status(200).json({ message: "User created" });
    } catch (err) {
      next(err);
    }
  } catch (err) {
    next(err);
  }
};

export const postRefresh = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  try {
    const decoded = verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const { id } = decoded as { id: string };

    const user = await User.findOne({ id });
    if (!user) {
      return res.status(403);
    }
    const accessToken = sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ accessToken });
  } catch (err) {
    return res.status(403);
  }
};

export const postLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id, password } = req.body;
  const { serverid } = req.headers;

  const prefixedId = makePrefixedId(id, serverid as string);

  const user = await User.findOne({ id: prefixedId });
  if (!user) {
    return res.status(400).json({ message: "Invalid id or password" });
  }

  bcrypt.compare(password, user.password, (err, result) => {
    if (err || !result) {
      return res.status(400).json({ message: "Invalid id or password" });
    }
  });

  const accessToken = sign(
    { id: prefixedId },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "7d",
    }
  );
  const refreshToken = sign(
    { id: prefixedId },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "2w",
    }
  );

  const token = new Token({
    userId: prefixedId,
    token: refreshToken,
    expires: new Date(Date.now() + 3600000 * 24 * 7),
  });

  await token.save();

  res.json({ accessToken, refreshToken });
};

export const postLogout = (
  req: Request,
  res: Response,
  next: NextFunction
) => {};
