import passport from "passport";
import { Strategy } from "passport-local";

import { User } from "../models/user.model";


// req.login(user)
passport.serializeUser<any, any>((req, user, done) => {
  done(null, user.id);
});

// client => session => request
passport.deserializeUser((id, done) => {
  User.scan('id').eq(id).exec((error, user) => {
    if(error){
      return done(error)
    }
    // insert user to req.user
    done(null, user);
  });
});

passport.use(
  "local",
  new Strategy(
    { usernameField: "name", passwordField: "password" },
    async (id, password, done) => {
      User.findOne({ id: id.toLowerCase() }).exec((err: Error, user) => {
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
