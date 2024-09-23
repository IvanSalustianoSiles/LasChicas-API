import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { cartsModel } from "./carts.model.js";

mongoose.pluralize(null);

const usersCollection = "users";

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "user", "premium"],
    default: "user",
  },
  email: { type: String, required: true },
  phoneNumber: { type: String, default: "No specified" },
  description: { type: String, default: "No specified" },
  age: { type: Number },
  cart: { type: mongoose.Schema.Types.ObjectId, ref: "carts", required: true },
  documents: [
    {
      name: { type: String },
      reference: { type: String }
    }
  ],
  last_connection: { type: Date },
  active: { type: Boolean, default: true },
  status: { type: Boolean, default: false }
});

userSchema.pre("find", function () {
  this.populate({ path: "cart", model: cartsModel });
});

userSchema.plugin(mongoosePaginate);

export const usersModel = mongoose.model(usersCollection, userSchema);
