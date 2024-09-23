import Assert from "assert";
import mongoose from "mongoose";
import UserMDBService from "../src/services/user/user.mdb.dao.js";
import config from "../src/config.js";
import chai from "chai";

const connection = mongoose.connect(config.MONGO_URI);
const expect = chai.expect;
const testUser = { first_name: "Jerry", last_name: "Smith", password: "Coki2011", email: "jerrysmith@gmail.com" };

describe("Test DAO-MDB Service", function() {
    before(function() {});
    beforeEach(function() {});
    after(function() {});
    afterEach(function() {});
    it("addUser() | Debe retornar el objeto del usuario agregado", async function() {
        const result = await UserMDBService.addUser(testUser);
        expect(result).to.be.an("object");
        expect(result._id).to.be.not.null;
    });
    it("getAllUsers() | Debe retornar un array de usuarios", async function() {
        const result = await UserMDBService.getAllUsers();
        expect(result).to.be.an("array");
    });
    it("findUser(emailFilter) |  Debe retornar el objeto del usuario encontrado por email", async function() {
        const result = await UserMDBService.findUser({ email: testUser.email });
        testUser._id = result._id;
        expect(result).to.be.an("object");
        expect(result._id).to.be.not.null;
        expect(result.email).to.be.deep.equal(testUser.email);
    });
    it("findUser(IdFilter) | Debe retornar el objeto del usuario encontrado por ID", async function() {
        const id = testUser._id;
        const result = await UserMDBService.findUser({ _id: id });
        expect(result).to.be.an("object");
        expect(result._id).to.be.not.null;
        expect(result._id).to.be.deep.equal(id);
    });
    it("updateUser() | Debe retornar el objeto del usuario actualizado", async function() {
        const updateName = "Johnny";
        const result = await UserMDBService.updateUser({ email: testUser.email }, { first_name: updateName });
        expect(result).to.be.an("object");
        expect(result._id).to.be.not.null;
        expect(result.first_name).to.be.deep.equal(updateName);
    });
    it("paginateUsers() | Debe retornar un objeto con docs, limit y page mínimo", async function() {
        const result = await UserMDBService.paginateUsers();
        expect(result).to.be.an("object");
        expect(result.limit).to.be.not.null;
        expect(result.page).to.be.not.null;
        expect(result.docs).to.be.an("array");
    });
    it("deleteUser() | Debe retornar el objeto del usuario eliminado", async function() {
        const deleteName = "Johnny";
        const result = await UserMDBService.deleteUser({ first_name: deleteName });
        expect(result).to.be.an("object");
        expect(result._id).to.be.not.null;
        expect(result.first_name).to.be.deep.equal(deleteName);
    });
});
