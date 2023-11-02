import dotenv from "dotenv";
import { NextFunction, Response } from "express";
import { JwtPayload, verify } from "jsonwebtoken";

import { UserRequest } from "../type/express";

dotenv.config({ path: ".env" });

interface IUser {
  id: string;
  exp: number;
}

export const authMiddleware = (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const { authorization } = req.headers;
  const token = authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Invalid token" });
  }

  try {
    verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user: IUser) => {
      if (user?.id) {
        req.user = user as JwtPayload as IUser;
      }
    });

    if (!req.user) {
      return res.status(401).json({ message: "Invalid token" });
    } else {
      return next();
    }
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
