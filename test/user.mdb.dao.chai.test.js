import mongoose from "mongoose";
import UserMDBService from "../src/services/user/user.mdb.dao.js";
import config from "../src/config.js";
import chai from "chai";

const connection = mongoose.connect(config.MONGO_URI);
const expect = chai.expect;

let twoHundredDaysAgo = new Date();
twoHundredDaysAgo.setDate(twoHundredDaysAgo.getDate() - 200);

const testUsers = [
    { first_name: "Jerry", last_name: "Smith", password: "Coki2011", email: "jerrysmith@gmail.com" },
    { first_name: "Beth", last_name: "Smith", password: "Coki2011", email: "bethsmith@gmail.com" },
    { first_name: "Morty", last_name: "Smith", password: "Coki2011", email: "morty@gmail.com" },
    { first_name: "Rick", last_name: "Sanchez", password: "dontcare", email: "ricksanchez@gmail.com" }
]

describe("Test DAO-MDB User Service", function() {
    before(async function() {
        await UserMDBService.addUser(testUsers[0]);
        await UserMDBService.addUser(testUsers[1]);
        await UserMDBService.addUser(testUsers[3]);        
    });
    it("addUser() | Debe retornar el objeto del usuario agregado", async function() {
        const result = await UserMDBService.addUser(testUsers[2]);
        expect(result).to.be.an("object");
        expect(result._id).to.be.not.null;
    });
    it("getAllUsers() | Debe retornar un array de usuarios", async function() {
        const result = await UserMDBService.getAllUsers();
        expect(result).to.be.an("array");
    });
    it("findUser(emailFilter) |  Debe retornar el objeto del usuario encontrado por email", async function() {
        const result = await UserMDBService.findUser({ email: testUsers[2].email });
        testUsers[2]._id = result._id;
        expect(result).to.be.an("object");
        expect(result._id).to.be.not.null;
        expect(result.email).to.be.deep.equal(testUsers[2].email);
    });
    it("findUser(IdFilter) | Debe retornar el objeto del usuario encontrado por ID", async function() {
        const id = testUsers[2]._id;
        const result = await UserMDBService.findUser({ _id: id });
        expect(result).to.be.an("object");
        expect(result._id).to.be.not.null;
        expect(result._id).to.be.deep.equal(id);
    });
    it("updateUser() | Debe retornar el objeto del usuario actualizado", async function() {
        const updateName = "Johnny";
        const result = await UserMDBService.updateUser({ email: testUsers[2].email }, { first_name: updateName });
        expect(result).to.be.an("object");
        expect(result._id).to.be.not.null;
        expect(result.first_name).to.be.deep.equal(updateName);
    });
    it("updateUser() | Debe retornar el array de usuarios actualizados", async function() {
        const result = await UserMDBService.updateUser({ last_name: "Smith" }, { last_connection: twoHundredDaysAgo }, { multi: true, new: true });
        expect(result).to.be.an("array");
        expect(result.length).to.be.deep.equal(3);
        expect(result[0].last_connection).to.be.deep.equal(twoHundredDaysAgo);
        expect(result[1].last_connection).to.be.deep.equal(twoHundredDaysAgo);
        expect(result[2].last_connection).to.be.deep.equal(twoHundredDaysAgo);
    });
    it("paginateUsers() | Debe retornar un objeto con docs, limit y page mínimo", async function() {
        const result = await UserMDBService.paginateUsers();
        expect(result).to.be.an("object");
        expect(result.limit).to.be.not.null;
        expect(result.page).to.be.not.null;
        expect(result.docs).to.be.an("array");
    });
    it("deleteUser() | Debe retornar el objeto del usuario eliminado", async function() {
        const deleteLastName = "Sanchez";
        const result = await UserMDBService.deleteUser({ last_name: deleteLastName });
        expect(result).to.be.an("object");
        expect(result._id).to.be.not.null;
        expect(result.last_name).to.be.deep.equal(deleteLastName);
    });
    it("addFiles() | Debe agregar archivos a un usuario y devolverlo con ellos", async function() {
        const files = [{ originalname: "fake" }, { originalname: "fake2" }];
        const result = await UserMDBService.addFiles(testUsers[2]._id, files);
        expect(result).to.be.an("object");
        expect(result.documents).to.be.not.null;
        expect(result.documents).to.be.an("array");
        expect(result.documents[0].name).to.be.deep.equal("fake");
        expect(result.documents[1].name).to.be.deep.equal("fake2");
    });
    it("deleteAllInactiveUsers() | Debe retornar un array con los usuarios eliminados por inactividad", async function() {
        const result = await UserMDBService.deleteAllInactiveUsers(1000 * 60 * 60 * 48);
        expect(result).to.be.an("array");
        expect(result.length).to.be.deep.equal(3);
        expect(result[0].last_connection).to.be.deep.equal(twoHundredDaysAgo);
        expect(result[1].last_connection).to.be.deep.equal(twoHundredDaysAgo);
        expect(result[2].last_connection).to.be.deep.equal(twoHundredDaysAgo);
    });
});
