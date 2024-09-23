import config from "../../config.js";
import { usersModel } from "../../models/index.js";
import { errorDictionary } from "../../config.js";
import { cartsModel } from "../../models/index.js";
import CustomError from "../custom.error.class.js";

// Clase para controlar los métodos referentes a los usuarios.
class UserMDBClass {
  constructor(model) {
    this.model = model;
  };
  getAllUsers = async () => {
    try {
      const users = await this.model.find().lean();      
      if (!users) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Users`);
      return users;
    } catch (error) {
      return undefined;
    };
  }
  isRegistered = async (focusRoute, returnObject, req, res) => {
    try {
      return req.session.user
        ? res.render(focusRoute, returnObject)
        : res.redirect("/login");
    } catch (error) {
      return undefined;
    }
  };
  findUser = async (filter) => {
    try {
      let myUserArray = await usersModel.find(filter).lean();
      if (!myUserArray) throw new CustomError(errorDictionary.FOUND_USER_ERROR);
      let myUser = myUserArray[0];
      myUser = { ...myUser, _id: JSON.parse(JSON.stringify(myUser._id))};
      return myUser;
    } catch (error) {
      return undefined;
    };
  }
  addUser = async (user) => {
    try {

      const cart = await cartsModel.create({ products: [] });     
      
      const newUser = { ...user, cart: cart };
      
      const dbUser = await this.model.create(newUser);
      
      if (!dbUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuario a agregar`);
      return dbUser;
    } catch (error) {
      return undefined;
    }
  };
  updateUser = async (filter, update, options = { multi: false, new: true }) => {
    try {

      let dbUser = {};

      const { multi, ...restOptions } = options;

      dbUser = multi ? await this.model.updateMany(filter, update, restOptions)
      : await this.model.findOneAndUpdate(filter, update, restOptions);
      
      if (!dbUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuario a actualizar`);
      return dbUser;
    } catch (error) {
      return undefined;
    }
  };
  deleteUser = async (filter) => {
    try {
      let dbUser = await this.model.findOneAndDelete(filter).lean();
      if (!dbUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuario a eliminar`);
      dbUser = { ...dbUser, _id: JSON.parse(JSON.stringify(dbUser._id))};
      return dbUser;
    } catch (error) {
      return undefined;
    }
  };
  paginateUsers = async (limit = 10, page = 1, role = "user", where) => {
    try {
      const dbUsers = await this.model.paginate({ role: role }, { page: page, limit: limit });
      if (!dbUsers) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuarios paginados`);
      return dbUsers;
    } catch (error) {
      return undefined;
    }
  };
  addFiles = async (uid, files) => {
    try {
      const newDocuments = await files.map(file => {
        return { name: file.originalname, reference: `/src/public/img/${file.originalname}`}
      });
      const myUser = await this.findUser({ _id: uid });
      
      if (!myUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR);

      const updatedUser = await this.updateUser({ _id: uid }, { documents: [...myUser.documents, ...newDocuments] }, { new: true });

      if (!updatedUser) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, "User");

      return updatedUser;
      
    } catch (error) {
      throw new CustomError(error.type, `[paginateUsers]: ${error.message}`);
    }
  };
};

// Métodos a utilizar:
// isRegistered (focusRoute, returnObject, req, res)
// isRegisteredwToken (focusRoute, returnObject, req, res)
// findUser (filter)
// addUser (user)
// updateUser (filter, update, options)
// deleteUser (filter)
// paginateUsers (...filters)

const UserMDBService = new UserMDBClass(usersModel);

export default UserMDBService;
