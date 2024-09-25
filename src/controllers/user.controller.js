import config, { errorDictionary } from "../config.js";
import { UserMDBService, UserFSService, CustomError } from "../services/index.js";


class UserDTOCLass {
  constructor() {
  };
  removeSensitive = async (user) => {
    try {
      const { password, email, phoneNumber, ...filteredUser } = user;
      return filteredUser;
    } catch (error) {
      throw new CustomError(errorDictionary.UNHANDLED_ERROR, `Error de ejecución DTO; [${error}]`);
    }
  };
  parseStringToNumbers = async (stringyNumbs) => {
    try {
      let numbyStrings = {};
      for (let i = 0; i < Object.values(stringyNumbs).length; i++) {
        let myString = Object.values(stringyNumbs)[i];
        let stringKey = Object.keys(stringyNumbs)[i];
        if (myString == +myString) {
          myString = +myString;
        };
        numbyStrings[stringKey] = myString;
      };
      return numbyStrings;
    } catch (error) {
      throw new CustomError(error.type, `Error de ejecución DTO; [${error.message}]`);
    }
  };
};

const DTO = new UserDTOCLass();

class UserManagerClass {
  constructor(service) {
    this.service = service;
  };
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
      return await this.service.isRegistered(focusRoute, returnObject, req, res);
    } catch (error) {
      return undefined;
    }
  };
  findUser = async (filter, noSensitive) => {
    try {
      let foundUser = await this.service.findUser(filter);
      if (noSensitive) foundUser = await DTO.removeSensitive(foundUser);
      return foundUser;
    } catch (error) {
      return undefined;
    }
  };
  addUser = async (user) => {
    try {
      return await this.service.addUser(user);
    } catch (error) {
      return undefined;
    }
  };
  updateUser = async (filter, update, options) => {
    try {
      return await this.service.updateUser(filter, update, options);
    } catch (error) {
      return undefined;
    }
  };
  deleteUser = async (filter, options) => {
    try {
      return await this.service.deleteUser(filter, options);
    } catch (error) {
      return undefined;
    }
  };
  paginateUsers = async (limit, page, role, where) => {
    try {
      const parsed = await DTO.parseStringToNumbers({limit, page, role, where});     
      return await this.service.paginateUsers(parsed != {} ? parsed.limit : limit, parsed != {} ? parsed.page : page, parsed != {} ? parsed.role : role, where);
    } catch (error) {
      return undefined;
    }
  };
  addFiles = async (uid, files) => {
    try {
      return await this.service.addFiles(uid, files);
    } catch (error) {
      return undefined;
    }
  };
  deleteAllInactiveUsers = async (timeForDelete) => {
    try {
      return await this.service.deleteAllInactiveUsers(timeForDelete);
    } catch (error) {
      return undefined;
    }
  };
};

const service = config.DATA_SOURCE == "MDB" 
? UserMDBService
: UserFSService;

const UserManager = new UserManagerClass(service);

export default UserManager;

