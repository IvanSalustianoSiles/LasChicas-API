import Assert from "assert";
import mongoose from "mongoose";
import UserMDBService from "../src/services/user/user.mdb.dao.js";
import config from "../src/config.js";
const connection = mongoose.connect(config.MONGO_URI);
const assert = Assert.strict;
const testUser = { first_name: "Jerry", last_name: "Smith", password: "Coki2011", email: "jerrysmith@gmail.com" };

describe("Test DAO-MDB Service", function() {
    before(function() {});
    beforeEach(function() {});
    after(function() {});
    afterEach(function() {});
    it("addUser() | Debe retornar el objeto del usuario agregado", async function() {
        const result = await UserMDBService.addUser(testUser);
        assert.strictEqual(typeof(result), "object");
        assert.ok(result._id);
    });
    it("getAllUsers() | Debe retornar un array de usuarios", async function() {
        const result = await UserMDBService.getAllUsers();
        assert.strictEqual(Array.isArray(result), true);
    });
    it("findUser(emailFilter) |  Debe retornar el objeto del usuario encontrado por email", async function() {
        const result = await UserMDBService.findUser({ email: testUser.email });
        testUser._id = result._id;
        assert.strictEqual(typeof(result), "object");
        assert.ok(result._id);
        assert.deepStrictEqual(result.email, testUser.email);
    });
    it("findUser(idFilter) | Debe retornar el objeto del usuario encontrado por ID", async function() {
        const id = testUser._id;
        const result = await UserMDBService.findUser({ _id: id });
        assert.strictEqual(typeof(result), "object");
        assert.ok(result._id);
        assert.deepStrictEqual(result._id, id);
    });
    it("updateUser() | Debe retornar el objeto del usuario actualizado", async function() {
        const updateName = "Johnny";
        const result = await UserMDBService.updateUser({ email: testUser.email }, { first_name: updateName });
        assert.strictEqual(typeof(result), "object");
        assert.ok(result._id);
        assert.deepStrictEqual(result.first_name, updateName);
    });
    it("paginateUsers() | Debe retornar un objeto con docs, limit y page mínimo", async function() {
        const result = await UserMDBService.paginateUsers();
        assert.strictEqual(typeof(result), "object");
        assert.ok(result.limit);
        assert.ok(result.page);
        assert.deepStrictEqual(Array.isArray(result.docs), true);
    });
    it("deleteUser() | Debe retornar el objeto del usuario eliminado", async function() {
        const deleteName = "Johnny";
        const result = await UserMDBService.deleteUser({ first_name: deleteName });
        assert.strictEqual(typeof(result), "object");
        assert.ok(result._id);
        assert.deepStrictEqual(result.first_name, deleteName);
    });
});
