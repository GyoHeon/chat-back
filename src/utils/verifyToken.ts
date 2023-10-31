import dotenv from "dotenv";
import { verify } from "jsonwebtoken";

dotenv.config({ path: ".env" });

export const verifyToken = (accessToken: string) => {
  let userData = null;
  verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      console.warn(err);
    }
    userData = user;
  });

  return userData;
};
