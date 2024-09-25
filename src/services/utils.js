import bcrypt from "bcrypt";
import config from "../config.js";
import CustomError from "./custom.error.class.js";
import { errorDictionary } from "../config.js";
import { faker } from "@faker-js/faker";

// Middlewares

export const verifyMDBID = (ids, check = undefined) => {
  return (req, res, next) => {
    try {
      for (let i = 0; i < ids.length; i++) {
        let id = ids[i];
        if (!config.MONGODB_ID_REGEX.test(req.params[id])) throw new CustomError(errorDictionary.AUTHORIZE_ID_ERROR, `${req.params[id]}`);
      } 
      if (check !== undefined && check.compare && req.session.user.role.toUpperCase() != "ADMIN") {
        if ((check.compare == "USER" && req.params["uid"] != req.session.user._id) || (check.compare == "CART" && req.params["cid"] != req.session.user.cart)) throw new CustomError(errorDictionary.AUTHORIZE_USER_ERROR, "No corresponde su ID");
      }
      next();
    } catch (error) {
      throw error;
    } 
  }
};
export const verifyRequiredBody = (requiredFields) => {
   
  return (req, res, next) => {
    try {
      
      const allOk = requiredFields.every((field) => {

        return (
          req.body.hasOwnProperty(field) &&
          req.body[field] !== "" &&
          req.body[field] !== null &&
          req.body[field] !== undefined
        );
      });      
      
      if (!allOk) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR, `${requiredFields}`);   
      next();
    } catch (error) {
      throw error;
    }
  };
};
export const handlePolicies = (policies) => {
  return (req, res, next) => {
    try {   
      if (policies[0] === "PUBLIC") return next();
      let user = req.session.user;
      if (!user) res.redirect("/login");
      let role = user.role.toUpperCase();   
      if (!policies.includes(role)) throw new CustomError(errorDictionary.AUTHORIZE_USER_ERROR, `Rol ${user.role} no permitido.`);
      req.user = user;
      next();
    } catch (error) {
      throw error;
    }
  }
};
export const verifyRestoreCode = () => {
  return (req, res, next) => {
    try {
      if (!req.session) throw new CustomError(errorDictionary.AUTHENTICATE_USER_ERROR, `Faltan datos de sesión`);
      if (req.session.secretCode && (req.session.secretCode != req.params.code)) throw new CustomError(errorDictionary.AUTHORIZE_USER_ERROR, "Acceso denegado: Probablemente su link caducó.");
      next();
    } catch (error) {
      res.redirect(`/restore?error=${encodeURI(`${error.message}`)}`);
    }
  }
};
export const routeDate = () => {
  return (req, res, next) => {
    try {
      console.log("Obviamente entra acá")
      const routeDate = new Date();
      if (!routeDate) throw new CustomError(errorDictionary.GENERATE_DATA_ERROR, "Fecha");
      req.date = routeDate;
      next();
    } catch (error) {
      throw error;
    }
  }
};
export const regularCleanUp = (controller) => {
  return (req, res, next) => {
    try {
      setInterval(async () => {
        const aYearAgo = new Date();
        aYearAgo.setFullYear(aYearAgo.getFullYear() - 1);
        const updatedUsers = await controller.updateUser({ last_connection: { $lt: aYearAgo } }, { active: false }, { multi: true, new: true });
        if (!updatedUsers) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, "Usuarios inactivos para actualizar no encontrados");
      }, 1000 * 60 * 60 * 24);
      next();
    } catch (error) {
      req.logger.warning(`[ERROR[${error.status}]::CODE[${error.code}]: (${error.message ? error.message : "NO_SPECIFIC_WARNING"}) | ::[${req.url ? req.url : "UNKNOWN_LOCATION"}]`);
    }
  }
};

// No Middlewares

export const catchCall = (router, text) => {
  return router.all("*", async (req, res) => {
    throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `No se encontró la ruta de ${text} especificada`);
  });
};
export const createHash = (password) => {
  try {
    const validation = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    if (!validation) throw new CustomError(errorDictionary.GENERATE_DATA_ERROR, "Contraseña");
    return validation;
  } catch (error) {
    return undefined; 
  }
};
export const isValidPassword = (user, password) => { 
  try {    
    const compare = bcrypt.compareSync(password, user.password);
    if (!compare) throw new CustomError(errorDictionary.AUTHORIZE_PASS_ERROR);
    return compare;
  } catch (error) {
    return undefined;
  }
};
export const generateRandomId = () => {
  try {
    const possibleChars = "abcdefABCDEF0123456789";
    const charArray = [];
    for (let i = 0; i < 24; i++) {
      let randomIndex = Math.floor(Math.random() * possibleChars.length);
      let myChar = possibleChars[randomIndex];
      charArray.push(myChar);
    }
    return charArray.join("");
  } catch (error) {
    throw new CustomError(errorDictionary.GENERATE_DATA_ERROR, "Random_ID");
  }
};
export const generateRandomCode = (codeLength = 12) => {
  try {
    const possibleChars = "0123456789";
    const charArray = [];
    for (let i = 0; i < codeLength; i++) {
      let randomIndex = Math.floor(Math.random() * possibleChars.length);
      let myChar = possibleChars[randomIndex];
      charArray.push(myChar);
    }
    return `C-${charArray.join("")}`;
  } catch (error) {
    throw new CustomError(errorDictionary.GENERATE_DATA_ERROR, "Random_code")
  }
};
export const generateDateAndHour = () => {
  try {
    const now = new Date;
    return now.toLocaleString();
  } catch (error) {
    throw new CustomError(errorDictionary.GENERATE_DATA_ERROR, "Hora local")
  }

};
export const generateFakeProducts = async (quantity) => {
  try {
    const products = [];
    const categories = ["buzos", "camperas", "termos", "sabanas"];
    const statusArray = [true, false];
    for (let i = 0; i < quantity; i++) {
      const title = `${faker.commerce.productAdjective()} ${faker.commerce.product()} por ${faker.person.fullName()}`;
      const description = faker.commerce.productDescription();
      const price = Math.floor(faker.number.float({min: 500, max: 200000}));
      const code = Math.floor(faker.number.float({min: 1000, max: 8000}));
      const stock = Math.floor(faker.number.float({min: 0, max: 3000}));
      const category = categories[Math.floor(Math.random() * categories.length)];
      const status = statusArray[Math.floor(Math.random() * statusArray.length)];
      const thumbnail = faker.image.urlPlaceholder();
      products.push({ title, description, price, code, stock, category, status, thumbnail })
    };
    return products;
  } catch (error) {
    throw new CustomError(errorDictionary.GENERATE_DATA_ERROR, "Usuarios de prueba");
  }
};
