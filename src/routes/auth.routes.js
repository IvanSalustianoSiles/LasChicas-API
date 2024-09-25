import passport from "passport";
import initAuthStrategies from "../auth/passport.strategies.js";
import config, { errorDictionary } from "../config.js";
import { Router } from "express";
import { UserManager } from "../controllers/index.js";
import { verifyRequiredBody, routeDate, CustomError, handlePolicies, catchCall } from "../services/index.js";

const router = Router();

initAuthStrategies();

// Auth routes
router.post("/login", routeDate(), verifyRequiredBody(["email", "password"]), passport.authenticate("login", { failureRedirect: `/login?error=${encodeURI("Usuario y/o clave no válidos.")}` }), async (req, res) => {
  try {
      req.session.user = req.user;
      req.session.save(async (error) => {
        if (error) throw new CustomError(errorDictionary.SESSION_ERROR, `${error}`);
        await req.logger.info(`${req.date} Usuario "${req.session.user.email}" logeado; Sesión almacenada. | ::[${req.url}]`);
        res.redirect("/products");
      });
    } catch (error) {
      throw error;
    }
  }
); // CHECKED MDB
router.post("/register", routeDate(), verifyRequiredBody(["first_name", "last_name", "password", "email"]), passport.authenticate("register", { failureRedirect: `/register?error=${encodeURI("Email y/o contraseña no válidos.")}` }), async (req, res) => {
    try {       
      req.session.user = req.user;
      if (typeof(req.session.user.cart === "object")) req.session.user.cart = JSON.parse(JSON.stringify(req.session.user.cart));     
      req.session.save(async (error) => {
        if (error) throw new CustomError(errorDictionary.SESSION_ERROR, `${error}`);
        await req.logger.info(`${req.date} Usuario "${req.session.user.email}" registrado; Sesión almacenada. | ::[${req.url}]`);
        res.redirect("/products");
      });
    } catch (error) {
      throw error;
    }
  }
); // CHECKED MDB
router.get("/ghlogin", routeDate(), passport.authenticate("ghlogin"), async (req, res) => {
}
); // CHECKED MDB
router.get("/ghlogincallback", routeDate(), passport.authenticate("ghlogin", { failureRedirect: `/login?error=${encodeURI("Error de autenticación con GitHub")}` }), async (req, res) => {
    try {
      req.session.user = req.user;
      req.session.save(async (error) => {
        if (error) throw new CustomError(errorDictionary.SESSION_ERROR, `${error}`);
        await req.logger.info(`${req.date} Usuario "${req.session.user.email}" logeado con GitHub; Sesión almacenada. | ::[${req.url}]`);
        res.redirect("/profile");
      });
    } catch (error) {
      throw error;
    };
  }
); // CHECKED MDB
router.get("/private", routeDate(), handlePolicies(["ADMIN"]), async (req, res) => {
  try {
    await req.logger.warning(`${req.date} Usuario "${req.session.user.email}" entró a la ruta privada. | ::[${req.url}]`);
    res.status(200).send("Bienvenido, admin.");
  } catch (error) {
    throw error;
  }
}); // CHECKED MDB
router.get("/logout", routeDate(), async (req, res) => {
  try {
    const email = await req.session.user ? req.session.user.email : undefined; 
    if (!email) throw new CustomError(errorDictionary.SESSION_ERROR);
    req.session.destroy(async (error) => {
      if (error) throw new CustomError(errorDictionary.SESSION_ERROR, `${error}`);
      const updating = await UserManager.updateUser({ email: email }, { last_connection: req.date }, { new: true });
      if (!updating) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, "Usuario");
      await req.logger.info(`${req.date} Usuario "${email}" cerró sesión; Sesión destruída. | ::[${req.url}]`);
      res.redirect("/login");
    });
  } catch (error) {
    res.send(error);
  }
}); // CHECKED MDB
router.get("/current", routeDate(), async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");
    const myUser = await UserManager.findUser({ email: req.session.user.email }, true);
    if (!myUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR);
    await req.logger.info(`${req.date} Se ha accedido a los datos públicos de "${req.session.user.email}". | ::[${req.url}]`);
    res.status(200).send({ origin: config.SERVER, payload: myUser });
  } catch (error) {
    throw error;
  };
}); // CHECKED MDB
catchCall(router, "autenticaciones");

export default router;
