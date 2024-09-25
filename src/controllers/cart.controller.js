import config from "../config.js";
import { CartFSService, CartMDBService } from "../services/index.js";

class CartManagerClass {
  
  constructor(service) {
    this.carts = [];
    this.service = service;
  };
  createCart = async () => {
    try {
      return await this.service.createCart();
    } catch (error) {
      return undefined;
    }
  };
  addProduct = async (pid, cid) => {
    try {
      return await this.service.addProduct(pid, cid);
    } catch (error) {
      return undefined;
    }
  };
  deleteProduct = async (pid, cid) => {
    try {
      return await this.service.deleteProduct(pid, cid);
    } catch (error) {
      return undefined;
    }
  };
  getCartById = async (cid) => {
    try {
      return await this.service.getCartById(cid);
    } catch (error) {
      return undefined;
    }
  };
  updateCartById = async (cid, preUpdatedData) => {
    try {
      return await this.service.updateCartById(cid, preUpdatedData);
    } catch (error) {
      return undefined;
    }
  };
  updateQuantity = async (pid, cid, objectQuantity) => {
    try {
      return await this.service.updateQuantity(pid, cid, objectQuantity);
    } catch (error) {
      return undefined;
    }
  };
  deleteAllProducts = async (cid) => {
    try {
      return await this.service.deleteAllProducts(cid);
    } catch (error) {
      return undefined;
    }
  };
  getProductsOfACart = async (cid) => {
    try {
      return await this.service.getProductsOfACart(cid);
    } catch (error) {
      return undefined;
    }
  };
  getAllCarts = async () => {
    try {
      return await this.service.getAllCarts();
    } catch (error) {
      return undefined;
    }
  };
};

const service = config.DATA_SOURCE == "MDB" 
? CartMDBService
: CartFSService;

const CartManager = new CartManagerClass(service);

export default CartManager;
