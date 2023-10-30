import passport from "passport";
import { Strategy } from "passport-local";

import { User } from "../models/user.model";

// req.login(user)
passport.serializeUser<any, any>((req, user, done) => {
  done(null, user);
});

// client => session => request
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);

    // insert user to req.user
    done(null, user);
  } catch (error) {
    done(error);
  }
});

passport.use(
  "local",
  new Strategy(
    { usernameField: "name", passwordField: "password" },
    async (id, password, done) => {
      try {
        const user = await User.findOne({ id: id.toLowerCase() });

        if (!user) {
          return done(null, false, { message: "No user found" });
        }

        user.comparePassword(password, (error, isMatch) => {
          if (error) return done(error);

          if (isMatch) {
            return done(null, user);
          }
          return done(null, false, { message: "Invalid email or password" });
        });
      } catch (error) {
        return done(error);
      }
    }
  )
);
