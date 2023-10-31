import dotenv from "dotenv";
import { NextFunction, Response } from "express";
import { JwtPayload, verify } from "jsonwebtoken";

import { UserRequest } from "../type/express";

dotenv.config({ path: ".env" });

export const authMiddleware = (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      console.warn(err);
    }
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user as JwtPayload;
    next();
  });
};
