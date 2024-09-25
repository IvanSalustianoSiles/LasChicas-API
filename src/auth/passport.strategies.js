import passport from "passport";
import local from "passport-local";
import GitHubStrategy from "passport-github2";
import config, { errorDictionary } from "../config.js";
import { CartManager, UserManager } from "../controllers/index.js";
import { isValidPassword, createHash, CustomError } from "../services/index.js";

const localStrategy = local.Strategy;

const initAuthStrategies = () => {
  passport.use(
    "login",
    new localStrategy(
      { passReqToCallback: true, usernameField: "email" },
      async (req, username, password, done) => {   
        try {
          let myUser = await UserManager.findUser({ email: username });

          const validation = isValidPassword(myUser, password);
          
          if (myUser && validation) {
            
            if (myUser.active == false) return done("Tu usuario aún existe pero ha sido desactivado por falta de actividad. Por favor, contáctate con servicio técnico.");
            
            const updatedUser = await UserManager.updateUser({ email: username }, { last_connection: req.date }, { new: true });
            
            return done(null, updatedUser);
          } else {
            throw new CustomError(errorDictionary.AUTHORIZE_USER_ERROR, "Error al iniciar sesión");
          }
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
  passport.use(
    "register",
    new localStrategy(
      { passReqToCallback: true, usernameField: "email" },
      async (req, username, password, done) => {
        try {

          let user = await UserManager.findUser({ email: username });
          
          if (user) return done(new CustomError(errorDictionary.AUTHORIZE_USER_ERROR, "Datos ya ocupados"), false);    

          const newUser = { ...req.body, password: createHash(password), last_connection: req.date };
          
          let result = await UserManager.addUser(newUser);
          
          if (!result) throw new CustomError(errorDictionary.ADD_DATA_ERROR, "Usuario");
          
          return done(null, result);
          
        } catch (error) {
          return error;
        }
      }
    )
  );
  passport.use(
    "ghlogin",
    new GitHubStrategy(
      {
        clientID: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
        callbackURL: config.GITHUB_CALLBACK_URL,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const emailList = profile.emails || null;
          let response;
          let email = profile._json?.email || null;
          if (!email && !emailList) {
            response = await fetch("https://api.github.com/user/emails", {
              headers: {
                "Authorization": `token ${accessToken}`,
                "User-Agent": config.APP_NAME
              }
            });
            const emails = await response.json();
            email = emails.filter(email => email.verified).map(email => ({ value: email.email}))
          }
          if (email) {
            const foundUser = await UserManager.findUser({ email: email || emailList[0] });
            if (!foundUser) {
              const cart = await CartManager.createCart();
              let completeName = profile._json.name.split(" ");
              let last = completeName.pop();
              let first = completeName.join(" ");
              const newUser = {
                first_name: first,
                last_name: last,
                email: email,
                password: "none",
                cart: JSON.parse(JSON.stringify(cart._id)),
                last_connection: req.date
              };
              const addingUser = await UserManager.addUser(newUser);
              if (!addingUser) throw new CustomError(errorDictionary.ADD_DATA_ERROR, "Usuario");
              return done(null, addingUser);
            } else {
              console.log(`Usuario previamente registrado.`);
              if (foundUser.active == false) return done("Tu usuario aún existe pero ha sido desactivado por falta de actividad. Por favor, contáctate con servicio técnico.");
              const updatedUser = await UserManager.updateUser({ email: foundUser.email }, { last_connection: req.date }, { new: true }); 
              if (!updatedUser) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, "Usuario");
              return done(null, updatedUser);
            }
          } else {
            throw new CustomError(errorDictionary.FEW_PARAMS_ERROR, "Datos del perfil");
          }
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  passport.serializeUser((user, done) => {
    done(null, user);
  });
  passport.deserializeUser((user, done) => {
    done(null, user);
  });
};

export default initAuthStrategies;
