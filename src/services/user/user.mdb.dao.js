import CustomError from "../custom.error.class.js";
import { usersModel, cartsModel } from "../../models/index.js";
import { errorDictionary } from "../../config.js";

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
      
      const newUser = { ...user, cart: cart._id };

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
      
      if (multi) {
        if (!options.new) dbUser = await this.model.find(filter).lean();
        await this.model.updateMany(filter, update, restOptions);
        if (options.new == true ) dbUser = await this.model.find(filter).lean();
      } else {
        dbUser = await this.model.findOneAndUpdate(filter, update, restOptions);
      }
      
      if (!dbUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuario a actualizar`);
      return dbUser;
    } catch (error) {
      return undefined;
    }
  };
  deleteUser = async (filter, options = { multi: false }) => {
    try {
      let dbUsers;
      if (options.multi == true) {
        dbUsers = await this.model.find(filter).lean();
        await this.model.deleteMany(filter);
      } else {
        dbUsers = await this.model.findOneAndDelete(filter).lean();
      }
      if (!dbUsers) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuario a eliminar`);
      return dbUsers;
    } catch (error) {
      return undefined;
    }
  };
  paginateUsers = async (limit = 10, page = 1, role = "admin", where) => {
    try {
      const dbUsers = await this.model.paginate({ role: role }, { page: page, limit: limit });      
      if (!dbUsers) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuarios paginados`);    
      dbUsers.docs = dbUsers.docs.map(user => {
        const { first_name, last_name, role, email, ...restUser } = user;
        return { first_name:  first_name, last_name: last_name, role: role, email: email };
      });
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
      return undefined;
    }
  };
  deleteAllInactiveUsers = async (timeForDelete) => {
    try {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - timeForDelete / 1000 / 60 / 60 / 24);
      const deletedUsers = await this.deleteUser({ last_connection: { $lt: limitDate } }, { multi: true });
      if (!deletedUsers) throw new CustomError(errorDictionary.DELETE_DATA_ERROR, "Usuarios");
      return deletedUsers;
    } catch (error) {
      return undefined;
    }
  }
};

const UserMDBService = new UserMDBClass(usersModel);

export default UserMDBService;
