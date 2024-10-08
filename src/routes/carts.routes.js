import nodemailer from "nodemailer";
import config, { errorDictionary } from "../config.js";
import { Router } from "express";
import { CartManager, TicketManager, ProductManager } from "../controllers/index.js";
import { verifyMDBID, handlePolicies, generateRandomCode, generateDateAndHour, CustomError, routeDate, catchCall } from "../services/index.js";

let toSendObject = {};
const router = Router();

const transport = nodemailer.createTransport({
  service: "gmail",
  port: 587,
  auth: {
    user: config.GMAIL_APP_USER,
    pass: config.GMAIL_APP_PASSWORD
  }
});

router.get("/", handlePolicies(["ADMIN"]), async (req, res) => {
  try {
    const carts = await CartManager.getAllCarts();
    if (!carts) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, "Carritos");
    res.status(200).send({ origin: config.SERVER, payload: carts });
  } catch (error) {
    throw error;
}
}); 
router.post("/", routeDate(), handlePolicies(["USER", "PREMIUM", "ADMIN"]), async (req, res) => {
  try {
    toSendObject = await CartManager.createCart();
    if (!toSendObject) throw new CustomError(errorDictionary.GENERATE_DATA_ERROR, `Carrito`);
    await req.logger.info(`${req.date} Carrito creado. ${req.url}`);
    res.status(200).send(toSendObject);
  } catch (error) {
    throw error;
  };
}); 
router.get("/:cid", verifyMDBID(["cid"], { compare: "CART" }), async (req, res) => {
  try {
    const { cid } = req.params;
    toSendObject = await CartManager.getCartById(cid);
    if (!toSendObject) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, "Carrito");
    res.status(200).send(toSendObject);
  } catch (error) {
    throw error;
  };
}); 
router.post("/:cid/product/:pid", handlePolicies(["USER", "PREMIUM", "ADMIN"]), verifyMDBID(["cid", "pid"], { compare: "CART" }), async (req, res) => {
  try {
    const { pid, cid } = req.params;
    toSendObject = await CartManager.addProduct(pid, cid);
    if (!toSendObject) throw new CustomError(errorDictionary.ADD_DATA_ERROR, "Carrito");
    res.status(200).send(toSendObject);
  } catch (error) {
    throw error;
  };
}); 
router.delete("/:cid/product/:pid", handlePolicies(["USER", "PREMIUM", "ADMIN"]), verifyMDBID(["cid", "pid"], { compare: "CART" }), async (req, res) => {
  try {
    const { pid, cid } = req.params;
    toSendObject = await CartManager.deleteProduct(pid, cid);
    if (!toSendObject) throw new CustomError(errorDictionary.DELETE_DATA_ERROR, `Producto del carrito`);
    res.status(200).send(toSendObject);
  } catch (error) {
    throw error;
  };
}); 
router.put("/:cid", handlePolicies(["USER", "PREMIUM", "ADMIN"]), verifyMDBID(["cid"], { compare: "CART" }), async (req, res) => {
  try {
    const { cid } = req.params;
    toSendObject = await CartManager.updateCartById(cid, req.body);
    if (!toSendObject) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, `Carrito`);
    res.status(200).send(toSendObject);
  } catch (error) {
    throw error;
  };
});
router.put("/:cid/product/:pid", handlePolicies(["USER", "PREMIUM", "ADMIN"]), verifyMDBID(["cid", "pid"], { compare: "CART" }), async (req, res) => {
  try {
    const { pid, cid } = req.params;
    toSendObject = await CartManager.updateQuantity(pid, cid, req.body); // Formato del body: {"quantity": Number}
    if (!toSendObject) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, `Cantidad del producto`);
    res.status(200).send(toSendObject);
  } catch (error) {
    throw error;
  };
}); 
router.delete("/:cid", routeDate(), handlePolicies(["USER", "PREMIUM", "ADMIN"]), verifyMDBID(["cid"], { compare: "CART" }), async (req, res) => {
  try {
    const { cid } = req.params;
    toSendObject = await CartManager.deleteAllProducts(cid);
    if (!toSendObject) throw new CustomError(errorDictionary.DELETE_DATA_ERROR, `Productos del carrito`);
    await req.logger.info(`${req.date} Carrito vaciado. ${req.url}`);
    res.status(200).send(toSendObject);
  } catch (error) {
    throw error;
  };
}); 
router.get("/:cid/purchase", routeDate(), handlePolicies(["USER", "PREMIUM"]), verifyMDBID(["cid"], { compare: "CART" }), async (req, res) => {
  try {
    const { cid } = req.params;
    let cartProducts = await CartManager.getProductsOfACart(cid);
    if (!cartProducts) throw new CustomError(errorDictionary.FOUND_ID_ERROR, `${cid}`);
    if (cartProducts.length == 0) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR, `Carrito vacío`);
    let amount = 0;
    let ticketQuantity = 0;
    let msg = [];
    for (let i = 0; i < cartProducts.length; i++) {
      let product = cartProducts[i];
      const pid = product._id;
      if (product.stock == 0) {
        msg = [ ...msg, `El producto '${product.title}' no se pudo comprar. No queda stock.`];
      } else if (product.quantity <= product.stock) {
        ticketQuantity = product.quantity;
        product.stock = product.stock - product.quantity;
        product.quantity = 0;
        const updating = await ProductManager.updateProductById(pid, { stock: product.stock });
        if (!updating) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, `Stock de un producto`);
        const deleting = await CartManager.deleteProduct(pid, cid);
        if (!deleting) throw new CustomError(errorDictionary.DELETE_DATA_ERROR, `Producto "${product.title}" del carrito`);
        msg = [...msg, ""];
      } else if (product.quantity > product.stock) {
        ticketQuantity = product.stock;
        product.quantity = product.quantity - product.stock;
        product.stock = 0;
        const updatingQuantity = await CartManager.updateQuantity(pid, cid, { quantity: product.quantity });
        if (!updatingQuantity) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, `Ejemplares del producto`);
        const updatingProduct = await ProductManager.updateProductById(pid, { stock: product.stock });
        if (!updatingProduct) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, `Stock del producto`);
        msg = [...msg, `No pudo realizarse la compra completamente. Ha vaciado el stock del producto '${product.title}'. Quedarán en su carrito los ${product.quantity} productos que sobrepasaron el stock.`];
      };
      amount += ticketQuantity * product.price;
    }
    const ticketGen = await TicketManager.createTicket({code: generateRandomCode(), purchase_datetime: generateDateAndHour(), amount: amount, purchaser: req.user.email });

    if (!ticketGen) throw new CustomError(errorDictionary.GENERATE_DATA_ERROR, `Ticket`);

    await req.logger.info(`${req.date} Compra realizada por "${req.session.user.email}". ${req.url}`);
    
    const myTicket = await TicketManager.getTicket(ticketGen);

    if (!myTicket) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Ticket`);

    const email = await transport.sendMail({
      from: `Las Chicas <${config.GMAIL_APP_USER}>`, 
      to: req.user.email,
      subject: `[NO RESPONDER A ESTE CORREO] Hola, ${req.user.first_name}! aquí tienes tu ticket de compra`,
      html: 
      `<div> 
        <h1>Código de compra: ${myTicket.code}</h1>´
        <h2>Comprador: ${myTicket.purchaser}</h2>
        <h3>Total: ${myTicket.amount}</h3>
        <h4>Hora: ${myTicket.purchase_datetime}</h4>
        <h2>¡Gracias por comprar con las chicas!</h2>
      </div>`
    });
    
    let fullMessage = msg.join("") || "Todos los productos aprobados.";

    await req.logger.info(`${req.date} Confirmación de compra enviada a ${req.user.email}. | ::${req.url}`);
    
    const queryObject = { payload: `Ticket exitosamente creado. Revise su bandeja de entrada`,  message: fullMessage }
    
    res.redirect(`/purchasecompleted?payload=${encodeURI(queryObject.payload)}&&message=${encodeURI(queryObject.message)}`);
  
  } catch (error) {
    throw error;
  };
}); 
catchCall(router, "carritos");

export default router;
