import { Router } from "express";
import { handlePolicies, uploader, generateFakeProducts, verifyRestoreCode, verifyMDBID } from "../services/index.js";
import config from "../config.js";
import {
  CartManager,
  ProductManager,
  UserManager,
} from "../controllers/index.js";
import { errorDictionary } from "../config.js";
import CustomError from "../services/custom.error.class.js";

let toSendObject = {};
const router = Router();

router.get("/", async (req, res) => {
  let sessionActive = false;
  let name = req.session.user ? req.session.user.first_name : "usuario";
  if (req.session.user) sessionActive = true; 
  res.render("init", { sessionActive: sessionActive, name: name });
})
router.get("/products", handlePolicies(["USER", "PREMIUM", "ADMIN"]), async (req, res) => {
  try {
    let paginated = await ProductManager.getPaginatedProducts( req.query.limit, req.query.page, req.query.query, req.query.sort, req.query.available, "/products");
    if (!paginated) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Productos en paginación`);   
    const { docs, prevPage, nextPage, totalPages, limit, totalDocs, page, pagingCounter, hasPrevPage, hasNextPage} = paginated.payload;
    res.render(
      "home",
      {
        products: docs,
        prevPage: prevPage,
        nextPage: nextPage,
        totalPages: totalPages,
        limit: limit,
        totalDocs: totalDocs,
        page: page,
        pagingCounter: pagingCounter,
        hasPrevPage: hasPrevPage,
        hasNextPage: hasNextPage,
        nextLink: paginated.nextLink,
        prevLink: paginated.prevLink,
        sessionActive: req.session.user ? true : false,
        ...req.session.user,
        showError: req.query.error ? true : false,
        error: req.query.error,
        cartUrl: `/carts/${req.session.user.cart}`,
        cartAction: `/api/carts/${req.session.user.cart}/product`
      });
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
  }
});
router.get("/carts/:cid", handlePolicies(["USER", "PREMIUM", "ADMIN"]), verifyMDBID(["cid"], { compare: "CART" }), async (req, res) => {
  try {
    const { cid } = req.params;
    if (!cid) throw new CustomError(errorDictionary.FOUND_ID_ERROR, `${cid}`);
    const cart = await CartManager.getCartById(cid);
    if (!cart) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Carrito`);
    const toSendObject = await CartManager.getProductsOfACart(cart);
    let voidWarning = false;
    if (toSendObject.length == 0) voidWarning = true;
    if (!toSendObject) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Productos del carrito`);
    res.render("cart", { toSendObject: toSendObject, voidWarning: voidWarning, purchaseAction: `/api/carts/${cid}/purchase` });
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
}
});
// router.get("/realtimeproducts", handlePolicies(["USER", "PREMIUM", "ADMIN"]), async (req, res) => {
//   try {
//     toSendObject = await ProductManager.getPaginatedProducts();
//     if (!toSendObject) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Productos`);
//     res.render("realTimeProducts", { toSendObject: toSendObject });
//   } catch (error) {
//     req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
//     res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
// }
// });
// router.post("/realtimeproducts", uploader.single("archivo"), async (req, res) => {
//   try {
//     const socketServer = await req.app.get("socketServer");
//     const { newProduct, productAction } = JSON.parse(req.body.json);
//     const { id } = newProduct;
//     if (!newProduct || !productAction || id) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR);
//     if (productAction == "add") {
//       let toAddProduct = {
//         ...newProduct,
//         thumbnail: req.file.filename,
//         status: true,
//       };
//       const addingAndGetting = await ProductManager.addProducts(toAddProduct);
//       if (!addingAndGetting) throw new CustomError(errorDictionary.ADD_DATA_ERROR, `Error al agregar productos`);
//       const dbProduct = await addingAndGetting.find(product => {
//         product.title == toAddProduct.title &&
//         product.description == toAddProduct.description &&
//         product.price == toAddProduct.price &&
//         product.code == toAddProduct.code &&
//         product.stock == toAddProduct.stock &&
//         product.category == toAddProduct.category &&
//         product.status == toAddProduct.status &&
//         product.thumbnail == toAddProduct.thumbnail 
//       });
//       if (!dbProduct) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Producto`);
//       let toAddId = dbProduct._id;
    
//       await socketServer.emit("addConfirmed", { msg: "Producto agregado.", toAddId });
//     } else if (productAction == "delete") {
//       await ProductManager.deleteProductById(id);
//       await socketServer.emit("deleteConfirmed", {
//         msg: `Producto de ID ${id} eliminado.`,
//         pid: id,
//       });
//     }
//     res.render("realTimeProducts", { toSendObject: toSendObject });
//   } catch (error) {
//     req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
//     res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
// }
// });
router.get("/chat", handlePolicies(["USER"]), async (req, res) => {
  try {
    res.render("chat", {});
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
  }
});
router.get("/login", async (req, res) => {
  try {
    !req.session.user ? res.render("login", { postAction: "/api/auth/login", hrefReg: "/register", showError: req.query.error ? true : false, errorMessage: req.query.error }) : res.redirect("/profile");
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
}
});
router.get("/register", (req, res) => {
  try {
    !req.session.user
    ? res.render("register", { postAction: "/api/auth/register", hrefLog: "/login", showError: req.query.error ? true : false, errorMessage: req.query.error })
    : res.redirect("/profile");
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
}
});
router.get("/profile", handlePolicies(["USER", "PREMIUM", "ADMIN"]), async (req, res) => {
  try {
    res.render("profile", { user: req.session.user, showWarning: req.query.warning ? true : false, warning: req.query.warning, cartAction: `/carts/${req.session.user.cart}`});
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
  }
});
router.get("/mockingproducts", async (req, res) => {
  try {
    const myProducts = await generateFakeProducts(100);  
    if (!myProducts) throw new CustomError(errorDictionary.GENERATE_DATA_ERROR, "Mock de productos");
    return res.send(myProducts);
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
}
});
router.get("/loggertest", async (req, res) => {
  const date = new Date().toDateString();
  const where = req.url;
  const loggerFatal = await req.logger.fatal(`${date} "Esto es un ejemplo de fatal" ${where}`);
  const loggerError = await req.logger.error(`${date} "Esto es un ejemplo de error" ${where}`);
  const loggerWarning = await req.logger.warning(`${date} "Esto es un ejemplo de warning" ${where}`);
  const loggerInfo = await req.logger.info(`${date} "Esto es un ejemplo de info" ${where}`);
  const loggerHttp = await req.logger.http(`${date} "Esto es un ejemplo de http" ${req.method} ${where}`);
  const loggerDebug = await req.logger.debug(`${date} "Esto es un ejemplo de debug" ${req.method} ${where}`);
  if (loggerFatal && loggerError && loggerWarning && loggerInfo && loggerHttp && loggerDebug) res.send({ origin: config.SERVER, payload: "Operación exitosa."})
});
router.get("/restore", async (req, res) => {
  try {
    res.render("restore", { postAction: "/api/users/restore", showError: req.query.error ? true : false, errorMessage: req.query.error, showOk: req.query.ok ? true : false, okMessage: req.query.ok });
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
  }
});
router.get("/restorecallback/:code", verifyRestoreCode(), async (req, res) => {
  try {
    const toSendObject = { postAction: "/api/users/restorecallback", dataErrorContainer: req.query.dataError ? true : false, dataError: req.query.dataError };
    res.render("restorecallback", { ...toSendObject });
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
  }
});
router.get("/roleChange/:uid", verifyMDBID(["uid"]), handlePolicies(["ADMIN"]), async (req, res) => {
  try {
    const { uid } = req.params;
    res.render("roleChange", { postAction: `/api/users/premium/${uid}` });
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
  }
});
router.get("/:uid/documents", handlePolicies(["USER", "PREMIUM", "ADMIN"]), verifyMDBID(["uid"], { compare: "USER" }), async (req, res) => {
  try {
    const { uid } = req.params;

    res.render("documents", {  postAction: `/api/users/${uid}/documents` })
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
  }
});
router.get("/user/:uid", handlePolicies(["ADMIN"]), async (req, res) => {
  try {
    const { uid } = req.params;
    const myUser = await UserManager.findUser({ _id: uid });
    if (!myUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR);
    res.render("user", { roleChangeAction: `/roleChange/${uid}`, deleteUserAction: `/api/users/${uid}`, ...myUser });
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, status: error.status, type: error.type, message: error.message });
  }
});
router.get("/purchasecompleted", async (req, res) => {
  try {
    const { payload, message } = req.query;
    if (!payload || !message) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR);
    res.render("purchasecompleted", { payload: payload, message: message, error: false, showError: false });
  } catch (error) {
    res.render("purchasecompleted", { showError: true, error: error });
  }
})
export default router;
