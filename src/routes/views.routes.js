import config, { errorDictionary } from "../config.js";
import { Router } from "express";
import { handlePolicies, generateFakeProducts, verifyRestoreCode, verifyMDBID, CustomError, routeDate, catchCall } from "../services/index.js";
import { CartManager, ProductManager, UserManager } from "../controllers/index.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    let sessionActive = false;
    let name = req.session.user ? req.session.user.first_name : "usuario";
    if (req.session.user) sessionActive = true; 
    res.render("init", { sessionActive: sessionActive, name: name });
  } catch (error) {
    throw error;
  };
}); // CHECKED FS
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
    throw error;
  };
}); // CHECKED FS
router.get("/carts/:cid", handlePolicies(["USER", "PREMIUM", "ADMIN"]), verifyMDBID(["cid"], { compare: "CART" }), async (req, res) => {
  try {
    const { cid } = req.params;
    if (!cid) throw new CustomError(errorDictionary.FOUND_ID_ERROR, `${cid}`);
    const cart = await CartManager.getCartById(cid);
    if (!cart) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Carrito`);
    const toSendObject = await CartManager.getProductsOfACart(cart);
    let voidWarning = false;
    if (Array.isArray(toSendObject) && toSendObject.length == 0) voidWarning = true;
    if (!toSendObject) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Productos del carrito`);
    res.render("cart", { toSendObject: toSendObject, voidWarning: voidWarning, purchaseAction: `/api/carts/${cid}/purchase`, deleteProductAction: `/api/carts/${cid}/product`, cleanAction: `/api/carts/${cid}` });
  } catch (error) {
    throw error;
  };
});
router.get("/chat", handlePolicies(["USER"]), async (req, res) => {
  try {
    res.render("chat", {});
  } catch (error) {
    throw error;
  };
});
router.get("/login", async (req, res) => {
  try {
    !req.session.user ? res.render("login", { postAction: "/api/auth/login", hrefReg: "/register", showError: req.query.error ? true : false, errorMessage: req.query.error }) : res.redirect("/profile");
  } catch (error) {
    throw error;
  };
}); // CHECKED FS
router.get("/register", (req, res) => {
  try {
    !req.session.user
    ? res.render("register", { postAction: "/api/auth/register", hrefLog: "/login", showError: req.query.error ? true : false, errorMessage: req.query.error })
    : res.redirect("/profile");
  } catch (error) {
    throw error;
  };
});
router.get("/profile", handlePolicies(["USER", "PREMIUM", "ADMIN"]), async (req, res) => {
  try {
    console.log(req.session.user.cart)
    res.render("profile", { user: req.session.user, showWarning: req.query.warning ? true : false, warning: req.query.warning, cartAction: `/carts/${JSON.parse(JSON.stringify(req.session.user.cart))}`});
  } catch (error) {
    throw error;
  };
});
router.get("/mockingproducts", async (req, res) => {
  try {
    const myProducts = await generateFakeProducts(100);  
    if (!myProducts) throw new CustomError(errorDictionary.GENERATE_DATA_ERROR, "Mock de productos");
    return res.send(myProducts);
  } catch (error) {
    throw error;
  };
});
router.get("/loggertest", routeDate(), async (req, res) => {
  const date = req.date;
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
    throw error;
  };
});
router.get("/restorecallback/:code", verifyRestoreCode(), async (req, res) => {
  try {
    const toSendObject = { postAction: "/api/users/restorecallback", dataErrorContainer: req.query.dataError ? true : false, dataError: req.query.dataError };
    res.render("restorecallback", { ...toSendObject });
  } catch (error) {
    throw error;
  };
});
router.get("/roleChange/:uid", handlePolicies(["ADMIN"]), verifyMDBID(["uid"]), async (req, res) => {
  try {
    const { uid } = req.params;
    res.render("roleChange", { postAction: `/api/users/premium/${uid}` });
  } catch (error) {
    throw error;
  };
});
router.get("/:uid/documents", handlePolicies(["USER", "PREMIUM", "ADMIN"]), verifyMDBID(["uid"], { compare: "USER" }), async (req, res) => {
  try {
    const { uid } = req.params;
    res.render("documents", {  postAction: `/api/users/${uid}/documents` })
  } catch (error) {
    throw error;
  }
});
router.get("/user/:uid", handlePolicies(["ADMIN"]), async (req, res) => {
  try {
    const { uid } = req.params;
    const myUser = await UserManager.findUser({ _id: uid });
    if (!myUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR);
    res.render("user", { roleChangeAction: `/roleChange/${uid}`, deleteUserAction: `/api/users/${uid}`, ...myUser });
  } catch (error) {
    throw error;
  };
});
router.get("/purchasecompleted", async (req, res) => {
  try {
    const { payload, message } = req.query;
    if (!payload || !message) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR);
    res.render("purchasecompleted", { payload: payload, message: message, error: false, showError: false });
  } catch (error) {
    res.render("purchasecompleted", { showError: true, error: error });
  }
});

export default router;
