import { Router } from "express";
import { uploader } from "../services/index.js";
import { ProductManager } from "../controllers/index.js";
import { verifyMDBID, catchCall, handlePolicies, generateFakeProducts } from "../services/index.js";
import { errorDictionary } from "../config.js";
import CustomError from "../services/custom.error.class.js";
import config from "../config.js";

let toSendObject = {};
const router = Router();

const productPolicies = () => {
  return async (req, res, next) => {
    try {
      let user = req.user;
      if (!user) throw new CustomError(errorDictionary.AUTHENTICATE_USER_ERROR);
      let role = user.role.toUpperCase();
      console.log(role);
      
      if (role == "ADMIN") return next();
      if (role !== "PREMIUM") throw new CustomError(errorDictionary.AUTHORIZE_USER_ERROR, "Rol premium requerido para realizar esta acción");
      const { pid } = req.params;

      console.log(pid);
      const myProduct = await ProductManager.getProductById(pid);
      console.log(myProduct);
      
      const canDeleteAndUpdate = user.email == myProduct.owner ? true : false;
      if (!canDeleteAndUpdate) throw new CustomError(errorDictionary.AUTHORIZE_USER_ERROR, "Sólo el vendedor puede eliminar o modificar sus productos.");
      req.user = user;
      next();
    } catch (error) {
      !req.user ? res.redirect(`/login?error=${encodeURI(`${errorDictionary.AUTHORIZE_USER_ERROR.message}`)}`) :
      res.redirect(`/products`); 
    }
  }
};

// Routes

router.get("/", async (req, res) => {
  try {
    toSendObject = await ProductManager.getPaginatedProducts(
      req.query.limit,
      req.query.page,
      req.query.query,
      req.query.sort,
      req.query.available,
      "/api/products"
    );
    if (!toSendObject) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, "Productos");
    res.send(toSendObject);
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
}
});
router.get("/:pid", handlePolicies(["ADMIN"]), verifyMDBID(["pid"]), async (req, res) => {
  try {
      if (!req.params.pid) throw new CustomError(errorDictionary.FOUND_ID_ERROR, `${req.params.pid}`);
      toSendObject = await ProductManager.getProductById(req.params.pid);
      if (!toSendObject) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, "Producto");
      res.status(200).send(toSendObject);
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
}
});
router.post("/", handlePolicies(["ADMIN", "PREMIUM"]), productPolicies(["ADMIN", "PREMIUM"]), uploader.single("thumbnail"), async (req, res) => {
  try {
    toSendObject = await ProductManager.addProducts({
      ...req.body,
      thumbnail: req.file.filename,
      status: true,
    });
    if (!toSendObject) throw new CustomError(errorDictionary.ADD_DATA_ERROR, "productos");
    await req.logger.info(`${new Date().toDateString()} Producto(s) agregado(s) al sistema, por el administrador "${req.session.user.first_name}". ${req.url}`);
    res.send(toSendObject);
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
}
});
router.put("/:pid", handlePolicies(["ADMIN", "PREMIUM"]), productPolicies(["ADMIN", "PREMIUM"]), verifyMDBID(["pid"]), async (req, res) => {
  try {
    const { pid } = req.params;
    toSendObject = await ProductManager.updateProductById(pid, req.body);
    if (!toSendObject) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, `Producto`);
    await req.logger.info(`${new Date().toDateString()} Producto de ID ${pid} actualizado. ${req.url}`);
    res.send(toSendObject);
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
}
});
router.delete("/:pid", handlePolicies(["ADMIN", "PREMIUM"]), productPolicies(["ADMIN", "PREMIUM"]), verifyMDBID(["pid"]), async (req, res) => {
  try {
    const { pid } = req.params;
    toSendObject = await ProductManager.deleteProductById(pid);
    if (!toSendObject) throw new CustomError(errorDictionary.DELETE_DATA_ERROR, `Producto`);
    await req.logger.info(`${new Date().toDateString()} Producto de ID ${pid} eliminado. ${req.url}`);
    res.send(toSendObject);
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
}
});
catchCall(router, "productos");

export default router;
