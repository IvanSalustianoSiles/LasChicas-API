import fs from "fs";
import CustomError from "../custom.error.class.js";
import config, { errorDictionary } from "../../config.js";
import { generateRandomId } from "../utils.js";

// Clase para controlar los métodos referentes a los carritos.
class CartFSClass {
  constructor() {
    this.cartsArray = [];
    this.productsArray = [];
    this.cartPath = `${config.DIRNAME}/jsons/cart.json`;
    this.productPath = `${config.DIRNAME}/jsons/product.json`;
    this.getting = false;
  };
  createCart = async () => {
    try {
      await this.readFileAndSave(this.cartsArray, this.cartPath);
      let myId = generateRandomId();
      while (this.cartsArray.some(cart => cart._id == myId)) {
        myId = generateRandomId();
      }
      let newCart = {
        _id: myId,
        products: [],
      };
  
      this.cartsArray.push(newCart);
      await this.updateFile(this.cartsArray, this.cartPath);
  
      return newCart;
    } catch (error) {
      return undefined;
    }
  };
  addProduct = async (pid, cid) => {
    try {
      if (!pid || !cid) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR, `${ !pid ? "Product ID" : "Cart ID" }`);
    
      await this.readFileAndSave(this.cartsArray, this.cartPath);
      await this.readFileAndSave(this.productsArray, this.productPath);
      
      const fileProduct = await this.productsArray.find(product => product._id == pid);
  
      if (!fileProduct) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Producto`);
    
      const newProduct = {
        _id: {...fileProduct},
        quantity: 1
      }
  
      if (Object.values(newProduct._id).includes(undefined) || Object.values(newProduct._id).includes()) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR, `Al producto le faltan propiedades`);
      
      let myCart = await this.getCartById(cid);
  
      if (!myCart) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Producto`);

      let myProduct = await myCart.products.find((product) => product._id._id == newProduct._id._id);
      
      if (myProduct) {
        const indexOfProd = myCart["products"].indexOf(myProduct);
        newProduct.quantity = myProduct.quantity + newProduct.quantity;
        myCart["products"].splice(indexOfProd, 1);
        myCart["products"].push(newProduct);
        this.cartsArray.push(myCart);
        await this.updateFile(this.cartsArray, this.cartPath);
      } else {
        myCart["products"].push(newProduct);
      }
      await this.updateFile(this.cartsArray, this.cartPath);
      return myCart;
    } catch (error) {
      return undefined;
    }
  };
  getProductsOfACart = async (cid) => {
    try {
      this.getting = true;
      if (!cid) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR, `Cart ID`);
      await this.readFileAndSave(this.cartsArray, this.cartPath);
      let gottenCart = await this.cartsArray.find((cart) => cart._id == cid);
      if (gottenCart) {
        this.getting = false;
        let products = await gottenCart.products.map(product => {
          let fixedProduct = { ...product._id, quantity: product.quantity };
          return fixedProduct;
        });
        return products;
      } else {
        throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Carrito`);
      }
    } catch (error) {
      return undefined;
    }
  };
  deleteProduct = async (pid, cid) => {
    try {
      if (!pid || !cid) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR, `${ !pid ? "Product ID" : "Cart ID" }`);
      await this.readFileAndSave(this.cartsArray, this.cartPath);
      let myCart = await this.cartsArray.find((cart) => cart._id == cid);
      if (!myCart) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Carrito`);
      const cartIndex = this.cartsArray.indexOf(myCart);
      let myProduct = await myCart.products.find(
        (product) => product._id._id == pid
      );
      if (!myProduct) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Producto`);
      const productIndex = myCart.products.indexOf(myProduct);
      myCart.products.splice(productIndex, 1);
      this.cartsArray.splice(cartIndex, 1, myCart);
      await this.updateFile(this.cartsArray, this.cartPath);
      return `Producto de ID "${pid}" eliminado en el carrito de ID "${cid}".`;
    } catch (error) {
      return undefined;
    }
  };
  getCartById = async (cid) => {
    try {
      if (!cid) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR, `Cart ID`);
      await this.readFileAndSave(this.cartsArray, this.cartPath);
      let cartById = await this.cartsArray.find((cart) => cart._id == cid);
      if (!cartById) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, "Carrito");
      return cartById;
    } catch (error) {
      return undefined;
    }
  };
  updateCartById = async (cid, preUpdatedData) => {
    try {
      if (!cid || !preUpdatedData) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR, `${!cid ? "ID de carrito" : "Datos para actualizar"}`)
      await this.readFileAndSave(this.cartsArray, this.cartPath);
      let myCart = await this.cartsArray.find((cart) => cart._id == cid);
      if (!myCart) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, "Carrito");
      myCart["products"] = []
      let updatedProducts = [];
      preUpdatedData.forEach(async (product) => {
        let updatedProduct = {
          _id: product._id,
          quantity: product.quantity,
        };
        updatedProducts.push(updatedProduct);
      });
      myCart["products"] = updatedProducts;

      const updatedCart = await this.getCartById(cid);

      if (!updatedCart) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, "Carrito actualizado");

      const cartIndex = this.cartsArray.indexOf(updatedCart);
      this.cartsArray.splice(cartIndex, 1);
      this.cartsArray.push(updatedCart);
      await this.updateFile(this.cartsArray, this.cartPath);

      return (updatedCart);
    } catch (error) {
      return undefined;
    }
  };
  updateQuantity = async (pid, cid, objectQuantity) => {
    try {
      if (!cid || !pid || !objectQuantity) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR, `${!cid ? "ID de carrito" : !pid ? "ID de producto" : "Cantidad de productos"}`);
      await this.readFileAndSave(this.cartsArray, this.cartPath);
      let myCart = await this.getCartById(cid);
      if (!myCart) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, "Carrito");
      const cartIndex = this.cartsArray.indexOf(myCart);
      let myProduct = await myCart["products"].find(
        (product) => product._id == pid
      );
      if (!myProduct) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, "Producto");
      const productIndex = myCart["products"].indexOf(myProduct);
      myProduct["quantity"] = objectQuantity.quantity;
      myCart["products"].splice(productIndex, 1);
      myCart["products"].push(myProduct);
      this.cartsArray.splice(cartIndex, 1);
      this.cartsArray.push(myCart);
      await this.updateFile(this.cartsArray, this.cartPath);
      return `Ahora hay ${myProduct["quantity"]} productos de ID ${pid} en el carrito de ID ${cid}.`;
    } catch (error) {
      return undefined;
    }
  };
  deleteAllProducts = async (cid) => {
    try {
      if (!cid) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR, "ID de carrito");
      await this.readFileAndSave(this.cartsArray, this.cartPath);
      let myCart = await this.cartsArray.find((cart) => cart._id == cid);
      if (!myCart) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, "Carrito");
      const cartIndex = this.cartsArray.indexOf(myCart);
      myCart["products"] = [];
      this.cartsArray.splice(cartIndex, 1);
      this.cartsArray.push(myCart);
      await this.updateFile(this.cartsArray, this.cartPath)
      return `Carrito de ID ${cid} limpiado.`;
    } catch (error) {
      return undefined;
    }
  };
  updateFile = async (array, path) => {
    try {
      fs.writeFile(`${path}`, JSON.stringify(array), () => {});
    } catch (error) {
      return undefined;
    }
  };
  readFileAndSave = async (array, path) => {
    try {
      if (fs.existsSync(path)) {
        let fileContent = fs.readFileSync(path, "utf-8");
        let parsedFileContent = await JSON.parse(fileContent);
        array.length = 0;
        array.push(...parsedFileContent);
        return await array;
      } else if (this.getting) {
        throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, "Lectura fallida, archivo no existente.");
      };
    } catch (error) {
      return undefined;
    }
  };
  getAllCarts = async () => {
    try {
      await this.readFileAndSave(this.cartsArray, this.cartPath);
      const myCarts = this.cartsArray;
      if (!myCarts) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, "Carrito");
      return myCarts;
    } catch (error) {
      return undefined;
    }
  };
};

const CartFSService = new CartFSClass();

export default CartFSService;
