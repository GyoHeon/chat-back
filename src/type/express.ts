import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export type UserRequest = Request & { user: string | JwtPayload };
