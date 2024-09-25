import chai from "chai";
import supertest from "supertest";
import { UserManager } from "../src/controllers/index.js";
import mongoose from "mongoose";
import config from "../src/config.js";
const expect = chai.expect;
const requester = supertest("https://laschicas-api.onrender.com");
const testUser = { first_name: "Jerry", last_name: "Smith", password: "Coki2011", email: "jerrysmith@gmail.com" };
let cookie = {};
let userId;

describe("Test Integración Autenticación de usuario", function() {
    before(async function() {
        const connection = await mongoose.connect(config.MONGO_URI);
    });
    beforeEach(function() {});
    after(function() {
        UserManager.deleteUser({ _id: userId });
    });
    afterEach(function() {});
    it("GET api/auth/current | Debe redireccionar a login si no hay una sesión activa", async function() {
        const { statusCode, _body, headers } = await requester.get("/api/auth/current");
        expect(statusCode).to.be.equals(302);    
        expect(headers.location).to.be.equals("/login");
    });
    it("POST api/auth/register | Debe registrar un nuevo usuario y redireccionar a /products", async function() {
        const { statusCode, _body, headers } = await requester.post("/api/auth/register").send(testUser)
        expect(_body).to.be.undefined;
        expect(statusCode).to.be.equals(302);
        expect(headers.location).to.be.equals("/products");

    });
    it("POST api/auth/register | No debe registrar un usuario con el mismo mail", async function() {
        const { statusCode, _body } = await requester.post("/api/auth/register").send(testUser);
        expect(_body.error).to.be.ok;
        expect(statusCode).to.be.equals(403);
    });
    it("POST api/auth/login | Debe loguear un usuario correctamente y redireccionar a /products", async function() {
        const response = await requester.post("/api/auth/login").send(testUser)
        .expect("Location", "/products");        
        expect(response._body).to.be.undefined;
        expect(response.statusCode).to.be.equals(302);     
        cookie = response.headers["set-cookie"];  
        
        const myUser = await UserManager.findUser({ email: testUser.email });
        
        userId = myUser._id;
    });
    it("POST api/auth/login | No debe loguear un usuario que no ingrese todos los campos", async function() {
        const { statusCode, _body } = await requester.post("/api/auth/login").send({ email: "fake@gmail.com" });
        expect(_body.error).to.be.ok;
        expect(statusCode).to.be.equals(400);
    });
    it("POST api/auth/login | No debe loguear un usuario que ingrese datos inválidos", async function() {
        const { statusCode, _body } = await requester.post("/api/auth/login").send({ email: "noestoyenlaDB@gmail.com", password: "contraseña(muyoriginal)" });
        expect(_body).to.be.ok;
        expect(statusCode).to.be.equals(403);
    });
    it("GET api/auth/current | Debe retornar el usuario en sesión", async function() {
        const { statusCode, _body } = await requester.get("/api/auth/current")
        .set("Cookie", cookie);
        expect(statusCode).to.be.equals(200);
        expect(_body).to.have.property("payload");  
        expect(_body.payload).to.have.property("_id", userId);
    });
    it("GET api/auth/logout | Debe encontrar una sesión, y como la ha destruído redireccionar a /login", async function() {
        const { statusCode, _body, headers } = await requester.get("/api/auth/logout") 
        .set("Cookie", cookie);
        expect(_body).to.be.undefined;
        expect(statusCode).to.be.equals(302);
        expect(headers.location).to.be.equals("/login");
    });
    it("GET api/auth/logout | Debe fallar al intentar destruir una sesión inexistente y retornar un error", async function() {
        const { _body } = await requester.get("/api/auth/logout") 
        expect(_body).to.be.ok;     
        expect(_body.type).to.be.ok;      
        expect(_body.type).to.be.have.property("code", 9);
        expect(_body.type).to.be.have.property("status", 500);
    });
});