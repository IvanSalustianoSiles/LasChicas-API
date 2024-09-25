import CustomError from "../custom.error.class.js";
import fs from "fs";
import config, { errorDictionary } from "../../config.js";
import { cartsModel } from "../../models/carts.model.js";
import { generateRandomId } from "../utils.js";

// Clase para controlar los métodos referentes a los usuarios.
class UserFSClass {
  constructor() {
    this.userArray = [];
    this.path = `${config.DIRNAME}/jsons/user.json`;
  }
  getAllUsers = async () => {
    try {
      await this.readFileAndSave();
      const users = this.userArray();
      if (!users) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Users`);
      return users;
    } catch (error) {
      return undefined;
    };
  };
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
      await this.readFileAndSave();
      let filteredUser = {};
      for (let i = 0; i < Object.values(filter).length; i++) {
        let filterValue = Object.values(filter)[i];
        let filterProp = Object.keys(filter)[i];
        this.userArray = this.userArray.filter(user => user[filterProp] == filterValue);
      };
      filteredUser = await this.userArray[0];
      if (!filteredUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuario a actualizar`);
      return filteredUser;
  } catch (error) {
    return undefined;
  };
  };
  addUser = async (user) => {
    try {
      if (Object.values(user).includes(undefined) || Object.values(user).includes("")) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR, "Ingrese más datos de usuario.");
      const role = user.role;
      user.role = !role ? "user" : user.role;
      user._id = generateRandomId();
      while (this.userArray.some(pUser => pUser._id == user._id)) {
        user._id = generateRandomId();
      };
      const cart = await cartsModel.create({ products: [] });     
      const newUser = { ...user, cart: cart };
      await this.readFileAndSave();
      this.userArray.push(newUser);
      await this.updateFile(this.userArray);
      return newUser;
    } catch (error) {
      return undefined;
    }
  };
  updateUser = async (filter, update, options = { multi: false, new: true }) => {
    try {
      await this.readFileAndSave();
      for (let i = 0; i < Object.values(filter).length; i++) {
        let filterValue = Object.values(filter)[i];
        let filterProp = Object.keys(filter)[i];
        this.userArray = this.userArray.filter(user => user[filterProp] == filterValue);
        if (filterValue.$lt) {
          this.userArray = this.userArray.filter(user => user[filterProp] < filterValue.less);
        } else if (filterValue.$gt) {
          this.userArray = this.userArray.filter(user => user[filterProp] > filterValue.greater);
        } else {
          this.userArray = this.userArray.filter(user => user[filterProp] == filterValue);
        }
      };      
      if (options.multi == true) {
        let filteredUsers = this.userArray;
        if (!filteredUsers) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuarios a actualizar`);
        let updatedUsers = [...filteredUsers];
        await this.readFileAndSave();
        for (let i = 0; i < Object.values(update).length; i++) {
          let updateValue = Object.values(update)[i];
          let updateProp = Object.keys(update)[i];
          for (let j = 0; j < updatedUsers.length; j++) {
            updatedUsers[j][updateProp] = updateValue;
            let foundUser = this.userArray.find(user => user.email == filteredUsers[j].email);                   
            let userIndex = this.userArray.indexOf(foundUser);
            this.userArray.splice(userIndex, 1, updatedUsers[j]);
          }
        };
        await this.updateFile(this.userArray);
        if (options.new == true) {
          return updatedUsers;
        } else {
          return filteredUsers;
        };
      } else {
        let filteredUser = this.userArray[0];
        if (!filteredUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuario a actualizar`);
        let updatedUser = {...filteredUser};
        for (let i = 0; i < Object.values(update).length; i++) {
          let updateValue = Object.values(update)[i];
          let updateProp = Object.keys(update)[i];
          updatedUser[updateProp] = updateValue;
        };
        await this.readFileAndSave();    
        const foundUser = this.userArray.find(user => user.email == filteredUser.email);                   
        const userIndex = this.userArray.indexOf(foundUser);                
        this.userArray.splice(userIndex, 1, updatedUser);
        await this.updateFile(this.userArray);    
        if (options.new == true) {
          return updatedUser;
        } else {
          return filteredUser;
        };
      }
    } catch (error) {
      return undefined;
    };
  };
  deleteUser = async (filter, options = { multi: false }) => {
    try {
      await this.readFileAndSave();
      for (let i = 0; i < Object.values(filter).length; i++) {
        let filterValue = Object.values(filter)[i];
        let filterProp = Object.keys(filter)[i];
        if (filterValue.$lt) {
          this.userArray = this.userArray.filter(user => user[filterProp] < filterValue.less);
        } else if (filterValue.$gt) {
          this.userArray = this.userArray.filter(user => user[filterProp] > filterValue.greater);
        } else {
          this.userArray = this.userArray.filter(user => user[filterProp] == filterValue);
        }
      };
      if (options.multi == true) {
        let filteredUsers = this.userArray;
        if (!filteredUsers) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuarios a eliminar`);
        await this.readFileAndSave();
        for (let i = 0; i < filteredUsers.length; i++) {
          let foundUser = this.userArray.find(user => user.email == filteredUsers[i].email);                   
          let userIndex = this.userArray.indexOf(foundUser);
          this.userArray.splice(userIndex, 1);
        }
        await this.updateFile(this.userArray);
        return filteredUsers;
      } else {
        let filteredUser = this.userArray[0];
        if (!filteredUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuario a actualizar`);
        await this.readFileAndSave();
        const foundUser = this.userArray.find(user => user.email == filteredUser.email);                   
        const userIndex = this.userArray.indexOf(foundUser);
        this.userArray.splice(userIndex, 1);
        await this.updateFile(this.userArray);    
        return filteredUser;
      }
    } catch (error) {
      return undefined;
    };
  };
  paginateUsers = async (limit = 10, page = 1, role, where) => {
    try {
      
      const lecture = await this.readFileAndSave();

      let matrixUsers = [];
      let j = 0;
      matrixUsers.push([]);

      role
        ? (this.userArray = this.userArray.filter(
            (user) => user.role == role
          ))
        : this.userArray;

      for (let i = 0; i < this.userArray.length; i++) {
        if (i == 0 || !(i % limit == 0)) {
          matrixUsers[j].push(this.userArray[i]);
        } else {
          matrixUsers.push([]);
          j++;
          matrixUsers[j].push(this.userArray[i]);
        }
      }
      let pageUsers = matrixUsers[page - 1];
      let totalPages = matrixUsers.length;
      let prevPage = page == 1 ? undefined : page - 1;
      let nextPage = !matrixUsers[page] ? undefined : page + 1;
      let prevUrl;
      let nextUrl;

      if (role) {
        prevPage
          ? (prevUrl = `${where}?role=${role}&page=${prevPage}&limit=${limit}`)
          : null;
        nextPage
          ? (nextUrl = `${where}?role=${role}&page=${nextPage}&limit=${limit}`)
          : null;
      } else {
        prevPage
          ? (prevUrl = `${where}?page=${prevPage}&limit=${limit}`)
          : null;
        nextPage
          ? (nextUrl = `${where}?page=${nextPage}&limit=${limit}`)
          : null;
      }
      this.getting = false;

      const paginateUsersFormat = pageUsers.map( user => {
        const { first_name, last_name, role, email, ...restUser } = user;
        return { first_name: first_name, last_name: last_name, role: role, email: email };
      });

      const toSendObject = {
        status: "success",
        payload: { docs: paginateUsersFormat, prevPage: prevPage, page: page, totalPages: totalPages, nextPage: nextPage },
        prevLink: prevUrl,
        nextLink: nextUrl,
      };
    
      return toSendObject;

    } catch (error) {
      return undefined;
    }
  };
  updateFile = async (array) => {
    try {
      fs.writeFileSync(`${this.path}`, JSON.stringify(array));
    } catch (error) {
      return undefined;
    }
  };
  readFileAndSave = async () => {
    try {
      if (fs.existsSync(this.path)) {
        let fileContent = fs.readFileSync(this.path, "utf-8") || null;
        let parsedFileContent = await JSON.parse(fileContent) || null;
        this.userArray = await parsedFileContent || [];
      } else {
        this.updateFile(this.userArray);
      }
      return this.userArray;
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
      const deletedUsers = await this.deleteUser({ last_connection: { $lt: limitDate }}, { multi: true });
      if (!deletedUsers) throw new CustomError(errorDictionary.DELETE_DATA_ERROR, "Usuarios");
      return deletedUsers;
    } catch (error) {
      return undefined;
    }
  };
};

const UserFSService = new UserFSClass();

export default UserFSService;
