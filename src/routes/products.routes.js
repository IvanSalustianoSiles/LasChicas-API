import nodemailer from "nodemailer";
import config, { errorDictionary } from "../config.js";
import { Router } from "express";
import { ProductManager } from "../controllers/index.js";
import { verifyMDBID, catchCall, handlePolicies, CustomError, uploader, routeDate } from "../services/index.js";

const router = Router();
let toSendObject = {};

const productPolicies = () => {
  return async (req, res, next) => {
    try {
      let user = req.user;
      if (!user) throw new CustomError(errorDictionary.AUTHENTICATE_USER_ERROR);
      let role = user.role.toUpperCase();
      
      if (role == "ADMIN") return next();
      if (role !== "PREMIUM") throw new CustomError(errorDictionary.AUTHORIZE_USER_ERROR, "Rol premium requerido para realizar esta acción");
      const { pid } = req.params;

      const myProduct = await ProductManager.getProductById(pid);
      
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

const transport = nodemailer.createTransport({
  service: "gmail",
  port: 587,
  auth: {
    user: config.GMAIL_APP_USER,
    pass: config.GMAIL_APP_PASSWORD
  }
});

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
    res.status(200).send(toSendObject);
  } catch (error) {
    throw error;
  };
});
router.get("/:pid", handlePolicies(["ADMIN"]), verifyMDBID(["pid"]), async (req, res) => {
  try {
      toSendObject = await ProductManager.getProductById(req.params.pid);
      if (!toSendObject) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, "Producto");
      res.status(200).send(toSendObject);
  } catch (error) {
    throw error;
  };
});
router.post("/", routeDate(), handlePolicies(["ADMIN", "PREMIUM"]), productPolicies(["ADMIN", "PREMIUM"]), uploader.single("products"), async (req, res) => {
  try {
    toSendObject = await ProductManager.addProducts({
      ...req.body,
      thumbnail: req.file.filename,
      status: true,
    });
    if (!toSendObject) throw new CustomError(errorDictionary.ADD_DATA_ERROR, "productos");
    await req.logger.info(`${req.date} Producto(s) agregado(s) al sistema por "${req.session.user.first_name}". | ::${req.url}`);
    res.status(200).send(toSendObject);
  } catch (error) {
    throw error;
  };
});
router.put("/:pid", routeDate(), handlePolicies(["ADMIN", "PREMIUM"]), productPolicies(["ADMIN", "PREMIUM"]), verifyMDBID(["pid"]), async (req, res) => {
  try {
    const { pid } = req.params;
    toSendObject = await ProductManager.updateProductById(pid, req.body);
    if (!toSendObject) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, `Producto`);
    await req.logger.info(`${req.date} Producto de ID ${pid} actualizado. | ::${req.url}`);
    res.status(200).send(toSendObject);
  } catch (error) {
    throw error;
  };
});
router.delete("/:pid", routeDate(), handlePolicies(["ADMIN", "PREMIUM"]), productPolicies(["ADMIN", "PREMIUM"]), verifyMDBID(["pid"]), async (req, res) => {
  try {
    const { pid } = req.params;
    toSendObject = await ProductManager.deleteProductById(pid);
    if (!toSendObject) throw new CustomError(errorDictionary.DELETE_DATA_ERROR, `Producto`);
    await req.logger.info(`${req.date} Producto de ID ${pid} eliminado. | ::${req.url}`);
    if (toSendObject.owner != "admin") {
      const email = await transport.sendMail({
        from: `Las Chicas <${config.GMAIL_APP_USER}>`, 
        to: toSendObject.owner,
        subject: `[NO RESPONDER A ESTE CORREO] Producto eliminado`,
        html: 
        `<div> 
          <h1>Hola! Tu producto ha sido eliminado de la base de datos</h1>´
          <h2>Nombre del producto: "${toSendObject.title}"</h2>
          <h3>Si tienes alguna consulta, consúltalo con nuestro servicio técnico (+54 11 3287-4847)</h3>
          <h2>¡Gracias por la atención!</h2>
        </div>`
      }); 
    }
    res.status(200).send(toSendObject);
  } catch (error) {
    throw error;
  };
});
catchCall(router, "productos");

export default router;
