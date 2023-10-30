import { NextFunction, Request, Response } from "express";
import { check, validationResult } from "express-validator";
import { sign, verify } from "jsonwebtoken";
import { Token } from "src/models/token.model";

import { User, UserDocument } from "src/models/user.model";
import { makePrefixedId } from "src/utils/makePrefixedId";

export const postSignup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  await check("password", "Password must be at least 5 characters long")
    .isLength({ min: 5 })
    .run(req);
  await check("name", "Name cannot be blank").isLength({ min: 1 }).run(req);
  await check("id", "Id cannot be blank").isLength({ min: 1 }).run(req);

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    req.flash("errors", errors.formatWith((e) => e.msg).array());
    res.json(401);
  }

  const { id, serverId, password, name } = req.body;

  const prefixedId = makePrefixedId(id, serverId);

  const user = new User({
    id: prefixedId,
    name,
    password,
  });

  User.findOne(
    { id: prefixedId },
    async (err: NativeError, existingUser: UserDocument) => {
      if (err) {
        return next(err);
      }
      if (existingUser) {
        req.flash("errors", "Account with that email address already exists.");
        res.json(401);
      }
      try {
        await user.save();
      } catch (err) {
        next(err);
      }
    }
  );
};

export const postRefresh = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { cookies } = req;

  if (!cookies?.refreshToken) {
    return res.status(401);
  }

  const { refreshToken } = cookies;
  if (!refreshToken) {
    return res.status(403);
  }

  try {
    const decoded = verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const { id, serverId } = decoded as { id: string; serverId: string };

    const prefixedId = makePrefixedId(id, serverId);

    User.findOne({ id: prefixedId }, (err: NativeError, user: UserDocument) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(403);
      }
      const accessToken = sign(
        { id: prefixedId },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: "7d",
        }
      );
      return res.json({ accessToken });
    });
  } catch (err) {
    return res.status(403);
  }
};

export const postLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id, serverId, password } = req.body;

  const prefixedId = makePrefixedId(id, serverId);

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
