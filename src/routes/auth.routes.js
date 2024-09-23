import passport from "passport";
import { Router } from "express";
import config from "../config.js";
import initAuthStrategies from "../auth/passport.strategies.js";
import { UserManager } from "../controllers/index.js";
import CustomError from "../services/custom.error.class.js";
import { errorDictionary } from "../config.js";
import { verifyRequiredBody, uploader, routeDate } from "../services/index.js";
import { handlePolicies } from "../services/index.js";

const router = Router();

initAuthStrategies();

// Auth routes
router.post("/login", routeDate(), verifyRequiredBody(["email", "password"]), passport.authenticate("login", { failureRedirect: `/login?error=${encodeURI("Usuario y/o clave no válidos.")}` }), async (req, res) => {
  try {
      req.session.user = req.user;
      req.session.save(async (error) => {
        if (error) throw new CustomError(errorDictionary.SESSION_ERROR, `${error}`);
        await req.logger.info(`${req.date} Usuario "${req.session.user.email}" logeado; Sesión almacenada. ${req.url}`);
        res.redirect("/products");
      });
    } catch (error) {
      req.logger.error(`${req.date}; ${error}; ${req.url}`);
      res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
    }
  }
);
router.post("/register", routeDate(), verifyRequiredBody(["first_name", "last_name", "password", "email"]), passport.authenticate("register", { failureRedirect: `/register?error=${encodeURI("Email y/o contraseña no válidos.")}` }), async (req, res) => {
    try {       
      req.session.user = req.user;     
      req.session.save(async (error) => {
        if (error) throw new CustomError(errorDictionary.SESSION_ERROR, `${error}`);
        await req.logger.info(`${req.date} Usuario "${req.session.user.email}" registrado; Sesión almacenada. ${req.url}`);
        res.redirect("/products");
      });
    } catch (error) {
      req.logger.error(`${req.date}; ${error}; ${req.url}`);
      res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
    }
  }
);
router.get("/ghlogin", routeDate(), passport.authenticate("ghlogin", { scope: ["user"] }), async (req, res) => {
}
);
router.get("/ghlogincallback", routeDate(), passport.authenticate("ghlogin", { failureRedirect: `/login?error=${encodeURI("Error de autenticación con GitHub")}` }), async (req, res) => {
    try {
      req.session.user = req.user;
      req.session.save(async (error) => {
        if (error) throw new CustomError(errorDictionary.SESSION_ERROR, `${error}`);
        await req.logger.info(`${req.date} Usuario "${req.session.user.email}" logeado con GitHub; Sesión almacenada. ${req.url}`);
        res.redirect("/profile");
      });
    } catch (error) {
      req.logger.error(`${req.date}; ${error}; ${req.url}`);
      res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
    };
  }
);
router.get("/private", handlePolicies(["ADMIN"]), async (req, res) => {
  try {
    res.status(200).send("Bienvenido, admin.");
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
  }
});
router.get("/logout", routeDate(), async (req, res) => {
  try {
    const email = await req.session.user ? req.session.user.email : undefined; 
    if (!email) throw new CustomError(errorDictionary.SESSION_ERROR);
    req.session.destroy(async (error) => {
      if (error) throw new CustomError(errorDictionary.SESSION_ERROR, `${error}`);
      await UserManager.updateUser({ email: email }, { last_connection: req.date }, { new: true });
      await req.logger.info(`${req.date} Usuario "${email}" cerró sesión; Sesión destruída. ${req.url}`);
      res.redirect("/login");
    });
  } catch (error) {
    req.logger.error(`${req.date}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
  }
});
router.get("/current", async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");
    const myUser = await UserManager.findUser({ email: req.session.user.email }, true);
    res.status(200).send({origin: config.SERVER, payload: myUser });
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
}
});
export default router;
