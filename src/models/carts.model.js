import mongoose from "mongoose";
import { productsModel } from "./products.model.js";

mongoose.pluralize(null);

const cartsCollection = "carts";

const cartSchema = new mongoose.Schema({
  products: {
    type: [{ _id: mongoose.Schema.Types.ObjectId, quantity: Number }],
    ref: "products",
  },
});

cartSchema.pre("find", function () {
  this.populate({ path: "products._id", model: productsModel });
});

export const cartsModel = mongoose.model(cartsCollection, cartSchema);
