import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";
import { check, validationResult } from "express-validator";
import { sign, verify } from "jsonwebtoken";

import { Token } from "../models/token.model";
import { User } from "../models/user.model";
import { UserRequest } from "../type/express";
import { deletePrefixedId } from "../utils/deletePrefixedId";
import { makePrefixedId } from "../utils/makePrefixedId";

dotenv.config({ path: ".env" });

export const postSignup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await check("password", "Password must be at least 5 characters long")
    .isLength({ min: 5 })
    .run(req);
  await check("name", "Name cannot be blank").isLength({ min: 1 }).run(req);
  await check("id", "Id cannot be blank").notEmpty().run(req);
  await check("id", "Id only alphabetic and numbers")
    .matches(/^[a-zA-Z0-9]+$/)
    .run(req);
  await check("serverid", "ServerId cannot be blank").notEmpty().run(req);

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(401).json({ message: errors });
  }

  const { id, password, name } = req.body;
  const { serverid } = req.headers;

  const prefixedId = makePrefixedId(id, serverid as string);

  try {
    const existingUser = await User.findOne({ id: prefixedId });

    if (existingUser) {
      return res
        .status(401)
        .json({ message: "Account with that id address already exists." });
    }
  } catch (err) {
    return res.status(401).json({ message: "Invalid id or password" });
  }

  try {
    const user = new User({
      id: prefixedId,
      name,
      password,
    });

    await user.save();

    return res.status(200).json({ message: "User created" });
  } catch (err) {
    console.warn(err);
    return res.status(401).json({ message: "Invalid id or password" });
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
      return res.status(403).json({ message: "Unauthorized" });
    }
    const accessToken = sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ accessToken });
  } catch (err) {
    console.warn(err);
    return res.status(403).json({ message: "Unauthorized" });
  }
};

export const patchUser = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const { name, picture } = req.body;
  if (!(name || picture)) {
    return res.status(400).json({ message: "Invalid request" });
  }
  const newData = {
    [name && "name"]: name,
    [picture && "picture"]: picture,
  };

  const user = req.user;

  try {
    const userFromDb = await User.findOne({ id: user.id });

    if (!userFromDb) {
      return res.status(403).json({ message: "Unauthorized" });
    } else {
      if (newData.name) {
        await userFromDb.updateOne({
          name: newData.name,
        });
      }
      if (newData.picture) {
        await userFromDb.updateOne({
          picture: newData.picture,
        });
      }

      return res.status(200).json({ message: "User updated" });
    }
  } catch (err) {
    console.warn(err);
    return res.status(403).json({ message: "Unauthorized" });
  }
};

export const getUser = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const id = req.query.userId as string;
  const serverId = req.headers.serverid as string;
  if (!id && typeof id !== "string") {
    return res.status(400).json({ message: "Invalid id" });
  }

  const prefixedId = makePrefixedId(id, serverId);
  if (!prefixedId) {
    return res.status(400).json({ message: "Invalid serverId" });
  }

  try {
    const userFromDb = await User.findOne({ id: prefixedId });

    if (!userFromDb) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const responseUser = {
      id: deletePrefixedId(userFromDb.id),
      name: userFromDb.name,
      picture: userFromDb.picture,
    };

    return res.status(200).json({ user: responseUser });
  } catch (err) {
    console.warn(err);
    return res.status(403).json({ message: "Unauthorized" });
  }
};

export const postLogin = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const { id, password } = req.body;
  const { serverid } = req.headers;

  const prefixedId = makePrefixedId(id, serverid as string);

  const user = await User.findOne({ id: prefixedId });
  if (!user) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    return res.status(401).json({ message: "Invalid password" });
  }

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

  const token = {
    userId: prefixedId,
    token: refreshToken,
    expires: new Date(Date.now() + 3600000 * 24 * 7),
  };
  try {
    const existingToken = await Token.findOne({ userId: prefixedId });
    if (existingToken) {
      await Token.updateOne({ userId: prefixedId }, token);
    } else {
      const newToken = new Token(token);
      await newToken.save();
    }

    return res.status(200).json({ accessToken, refreshToken });
  } catch (err) {
    console.warn(err);
    return res.status(401).json({ message: "Invalid id or password" });
  }
};
