import { NextFunction, Request, Response } from "express";
import { check, validationResult } from "express-validator";
import passport from "passport";
import { IVerifyOptions } from "passport-local";

import { UserDocument } from "src/models/user.model";
import "../config/passport";

export const postLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await check("password", "Password is longer than 4")
    .isLength({ min: 5 })
    .run(req);

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    req.flash("errors", errors.formatWith((e) => e.msg).array());
    return res.json(401);
  }

  passport.authenticate(
    "local",
    (err: Error, user: UserDocument, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        req.flash("errors", info.message);
        return res.json(401);
      }
      req.logIn(user, (err: Error) => {
        if (err) {
          return next(err);
        }
        req.flash("success", "Success! You are logged in.");
        return res.json(200);
      });
    }
  )(req, res, next);
};

export const logout = (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.json(200);
  });
};
