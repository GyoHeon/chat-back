import passport from "passport";
import { Strategy } from "passport-local";
import User from "../models/users.model.js";

// req.login(user)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// client => session => request
passport.deserializeUser((id, done) => {
  User.findById(id).then((user) => {
    // insert user to req.user
    done(null, user);
  });
});

passport.use(
  "local",
  new Strategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      User.findOne({ email: email.toLowerCase() }).exec((err, user) => {
        if (err) return done(err);

        if (!user) {
          return done(null, false, { message: "No user found" });
        }

        user.comparePassword(password, (err, isMatch) => {
          if (err) return done(err);

          if (isMatch) {
            return done(null, user);
          }
          return done(null, false, { message: "Invalid email or password" });
        });
      });
    }
  )
);
