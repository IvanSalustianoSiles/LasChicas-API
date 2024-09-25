import Assert from "assert";
import mongoose from "mongoose";
import UserMDBService from "../src/services/user/user.mdb.dao.js";
import config from "../src/config.js";


const connection = mongoose.connect(config.MONGO_URI);
const assert = Assert.strict;

let twoHundredDaysAgo = new Date();
twoHundredDaysAgo.setDate(twoHundredDaysAgo.getDate() - 200);

const testUsers = [
    { first_name: "Jerry", last_name: "Smith", password: "Coki2011", email: "jerrysmith@gmail.com" },
    { first_name: "Beth", last_name: "Smith", password: "Coki2011", email: "bethsmith@gmail.com" },
    { first_name: "Morty", last_name: "Smith", password: "Coki2011", email: "morty@gmail.com" },
    { first_name: "Rick", last_name: "Sanchez", password: "dontcare", email: "ricksanchez@gmail.com" }
];

describe("Test DAO-MDB User Service", function() {
    before(async function() {
        await UserMDBService.addUser(testUsers[0]);
        await UserMDBService.addUser(testUsers[1]);
        await UserMDBService.addUser(testUsers[3]);
    });
    it("addUser() | Debe retornar el objeto del usuario agregado", async function() {
        const result = await UserMDBService.addUser(testUsers[2]);
        assert.strictEqual(typeof(result), "object");
        assert.ok(result._id);
    });
    it("getAllUsers() | Debe retornar un array de usuarios", async function() {
        const result = await UserMDBService.getAllUsers();
        assert.strictEqual(Array.isArray(result), true);
    });
    it("findUser(emailFilter) |  Debe retornar el objeto del usuario encontrado por email", async function() {
        const result = await UserMDBService.findUser({ email: testUsers[2].email });
        testUsers[2]._id = result._id;
        assert.strictEqual(typeof(result), "object");
        assert.ok(result._id);
        assert.deepStrictEqual(result.email, testUsers[2].email);
    });
    it("findUser(idFilter) | Debe retornar el objeto del usuario encontrado por ID", async function() {
        const id = testUsers[2]._id;
        const result = await UserMDBService.findUser({ _id: id });
        assert.strictEqual(typeof(result), "object");
        assert.ok(result._id);
        assert.deepStrictEqual(result._id, id);
    });
    it("updateUser() | Debe retornar el objeto del usuario actualizado", async function() {
        const updateName = "Johnny";
        const result = await UserMDBService.updateUser({ email: testUsers[2].email }, { first_name: updateName });
        assert.strictEqual(typeof(result), "object");
        assert.ok(result._id);
        assert.deepStrictEqual(result.first_name, updateName);
    });
    it("updateUser() | Debe retornar el array de usuarios actualizados", async function() {
        const result = await UserMDBService.updateUser({ last_name: "Smith" }, { last_connection: twoHundredDaysAgo }, { multi: true, new: true });
        assert.strictEqual(Array.isArray(result), true);
        assert.deepStrictEqual(result.length, 3);
        assert.deepStrictEqual(result[0].last_connection, twoHundredDaysAgo);
        assert.deepStrictEqual(result[1].last_connection, twoHundredDaysAgo);
        assert.deepStrictEqual(result[2].last_connection, twoHundredDaysAgo);
    });
    it("paginateUsers() | Debe retornar un objeto con docs, limit y page mínimo", async function() {
        const result = await UserMDBService.paginateUsers();
        assert.strictEqual(typeof(result), "object");
        assert.ok(result.limit);
        assert.ok(result.page);
        assert.deepStrictEqual(Array.isArray(result.docs), true);
    });
    it("deleteUser() | Debe retornar el objeto del usuario eliminado", async function() {
        const deleteLastName = "Sanchez";
        const result = await UserMDBService.deleteUser({ last_name: deleteLastName });
        assert.strictEqual(typeof(result), "object");
        assert.ok(result._id);
        assert.deepStrictEqual(result.last_name, deleteLastName);
    });
    it("addFiles() | Debe agregar archivos a un usuario y devolverlo con ellos", async function() {
        const files = [{ originalname: "fake" }, { originalname: "fake2" }];
        const result = await UserMDBService.addFiles(testUsers[2]._id, files);
        assert.strictEqual(typeof(result), "object");
        assert.notDeepStrictEqual(result.documents, null);
        assert.deepStrictEqual(Array.isArray(result.documents), true);
        assert.deepStrictEqual(result.documents[0].name, "fake");
        assert.deepStrictEqual(result.documents[1].name, "fake2");
    });
    it("deleteAllInactiveUsers() | Debe retornar un array con los usuarios eliminados por inactividad", async function() {
        const result = await UserMDBService.deleteAllInactiveUsers(1000 * 60 * 60 * 48);
        assert.strictEqual(Array.isArray(result), true);
        assert.deepStrictEqual(result.length, 3);
        assert.deepStrictEqual(result[0].last_connection, twoHundredDaysAgo);
        assert.deepStrictEqual(result[1].last_connection, twoHundredDaysAgo);
        assert.deepStrictEqual(result[2].last_connection, twoHundredDaysAgo);
    });
});
