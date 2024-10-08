import nodemailer from "nodemailer";
import config, { errorDictionary } from "../config.js";
import { Router } from "express";
import { UserManager } from "../controllers/index.js";
import { createHash, generateDateAndHour, generateRandomCode, isValidPassword, verifyMDBID, CustomError, handlePolicies, uploader, routeDate, catchCall } from "../services/index.js";

const router = Router();

const transport = nodemailer.createTransport({
  service: "gmail",
  port: 587,
  auth: {
    user: config.GMAIL_APP_USER,
    pass: config.GMAIL_APP_PASSWORD
  }
});

router.get("/", async (req, res) => {
  try {
    const users = await UserManager.paginateUsers(req.query.limit, req.query.page, req.query.role, "/api/users"); 
    if (!users) throw new CustomError(errorDictionary.FOUND_USER_ERROR);
    res.status(200).send({ origin: config.SERVER, payload: users });
  } catch (error){
    throw error;
  };
});
router.post("/", routeDate(), handlePolicies(["ADMIN"]), async (req, res) => {
  try {
    const process = await UserManager.addUser(req.body);
    if (!process) throw new CustomError(errorDictionary.ADD_DATA_ERROR, `Usuario`);
    await req.logger.warning(`${req.date} Usuario agregado desde ruta privada. ${req.url}`);
    res.status(200).send({ origin: config.SERVER, payload: process });
  } catch (error) {
    throw error;
  };
});
router.put("/:uid", handlePolicies(["ADMIN"]), verifyMDBID(["uid"]), async (req, res) => {
  try {
    const filter = { _id: req.params.uid };
    const update = req.body;
    const options = { new: true };
    const process = await UserManager.updateUser(filter, update, options);
    if (!process) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, `Usuario`);
    res.status(200).send({ origin: config.SERVER, payload: process });
  } catch (error) {
    throw error;
  };
});
router.delete("/:uid", routeDate(), handlePolicies(["ADMIN"]), verifyMDBID(["uid"]), async (req, res) => {
  try {
    const filter = { _id: req.params.uid };
    const process = await UserManager.deleteUser(filter);
    if (!process) throw new CustomError(errorDictionary.DELETE_DATA_ERROR, `Usuario`);
    await req.logger.info(`${req.date} Usuario de ID ${req.params.uid} eliminado. ${req.url}`);
    res.status(200).send({ origin: config.SERVER, payload: process });
  } catch (error) {
    throw error;
  };
});
router.post("/restore", async (req, res) => {
  try {
    const { email } = req.body;

    const emailValidation = await UserManager.findUser({ email: email });

    if (!emailValidation) res.redirect(`/restore?error=${encodeURI("Correo inválido.")}`);
    
    req.session.secretCode = generateRandomCode(15);
    req.session.temporalEmail = email;
    req.session.cookie.maxAge = 1000 * 60 * 60; 
    req.session.save(error => {
      if (error) CustomError(errorDictionary.SESSION_ERROR, `${error.message}`);
      res.redirect(`/restore?ok=${encodeURI("Listo! revisa tu bandeja de entrada.")}`);
    })
    const emailSending = await transport.sendMail({
      from: `Las Chicas <${config.GMAIL_APP_USER}>`, 
      to: email,
      subject: `[NO RESPONDER A ESTE CORREO] Cambio de contraseña`,
      html: 
      `<div> 
        <h1>Hola, ${emailValidation.first_name}!</h1>
        <h2>Este es tu link de cambio de contraseña:</h2>
        <a href=https://laschicas-api.onrender.com/restorecallback/${req.session.secretCode}>Validar contraseña</a>
        <h4>Hora [ARG]: ${generateDateAndHour()}</h4>
        <h2>Vence muy pronto así que te recomendamos usarlo ahora mismo.</h2>
        <h2>Hasta luego y gracias por elegirnos!</h2>
      </div>`
    });
  } catch (error) {
    throw error;
  };
});
router.post("/restorecallback", routeDate(), async (req, res) => {
  try {

    if (!req.session.secretCode || !req.session.temporalEmail) res.redirect(`/restore?error=${encodeURI(`Acceso denegado: Probablemente su link caducó.`)}`);
    
    const { password } = req.body;    
    
    const user = await UserManager.findUser({email: req.session.temporalEmail });
    
    const validationPass = isValidPassword(user, password);
    
    if (validationPass) res.redirect(`/restorecallback/${req.session.secretCode}?dataError=${encodeURI(`Escriba una contraseña diferente.`)}`);
    
    const updatedUser = await UserManager.updateUser({ email: req.session.temporalEmail }, { password: createHash(password) });
    
    req.session.temporalEmail = undefined;

    
    if (!updatedUser) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, "Usuario");
    req.session.user = updatedUser;
    res.redirect(`/profile?warning=${encodeURI(`Contraseña cambiada con éxito.`)}`);
    req.logger.warning(`${req.date} Usuario "${req.session.user.email}" cambió su contraseña; Sesión almacenada. | ::[${req.url}]`)
  } catch (error) {
    throw error;
  };
});
router.post("/premium/:uid", handlePolicies(["ADMIN"]), verifyMDBID(["uid"]), async (req, res) => {
  try {
    const { uid } = req.params;

    const myUser = await UserManager.findUser({ _id: uid });
        
    if (!myUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR);
    
    let role = myUser.role.toUpperCase();

    if (role == "USER") {
      if (!myUser.status) throw new CustomError(errorDictionary.AUTHORIZE_USER_ERROR, "El usuario posee documentos insuficientes para cambiar de rol");
      const updateOne = await UserManager.updateUser({_id: myUser._id}, {role: "premium"});
      if (!updateOne) throw new CustomError(errorDictionary.FOUND_USER_ERROR);
      req.logger.warning(`Rol de usuario ${myUser.email} cambiado a ${updateOne.role}. Procura que no sea un error. | ::${req.url}`);
      res.status(200).send({ origin: config.SERVER, payload: `Rol de usuario ${myUser.first_name} ${myUser.last_name} actualizado a ${updateOne.role}.`})
    } else {
      const updateTwo = await UserManager.updateUser({_id: myUser._id}, {role: "user"});
      if (!updateTwo) throw new CustomError(errorDictionary.FOUND_USER_ERROR);
      req.logger.warning(`Rol de usuario ${myUser.email} cambiado a ${updateTwo.role}. Procura que no sea un error. | ::${req.url}`);
      res.status(200).send({ origin: config.SERVER, payload: `Rol de usuario ${myUser.first_name} ${myUser.last_name} actualizado a ${updateTwo.role}.`})
    }
  } catch (error) {
    throw error;
  };
});
router.post("/:uid/documents", uploader.array("docs"), handlePolicies(["USER", "PREMIUM", "ADMIN"]), verifyMDBID(["uid"], { compare: "USER" }), async (req, res) => {
  try {
    const { uid } = req.params;
    if (req.files.length == 3) {
      const updatedUser = await UserManager.updateUser({ _id: uid }, { status: true }, { new: true });
      if (!updatedUser) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, "Usuario");
    }
    const addingFiles = await UserManager.addFiles(uid, req.files);
    if (!addingFiles) throw new CustomError(errorDictionary.ADD_DATA_ERROR, "Usuario");
  } catch (error) {
    throw error;
  };
});
router.delete("/", handlePolicies(["ADMIN"]), async (req, res) => {
  try {    
    const deletedUsers = await UserManager.deleteAllInactiveUsers(1000 * 60 * 60 * 48);
    if (!deletedUsers) throw new CustomError(errorDictionary.DELETE_DATA_ERROR, "Usuarios");
    deletedUsers.forEach( async (user) => {
      let userEmail = user.email;
      if (!userEmail) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR, "Email");
      let emailSending = await transport.sendMail({
        from: `Las Chicas <${config.GMAIL_APP_USER}>`, 
        to: userEmail,
        subject: `[NO RESPONDER A ESTE CORREO] Cuenta eliminada por inactividad`,
        html: 
        `<div> 
          <h1>Hola, ${user.first_name}!</h1>
          <h2>Lamentamos informarte que tu cuenta ha sido eliminada por inactividad.</h2>
          <h3>Puedes crear otra cuenta o comunicarte con el departamento técnico (+54 11 3287-4847)</h3>
          <h3>¡Esperamos volver a verte pronto!</h3>
          <h4>Hora [ARG]: ${generateDateAndHour()}</h4>
        </div>`
      });
    });
    req.logger.warning(`Usuarios inactivos eliminados. Procura que no sea un error. | ::${req.url}`);
    res.status(200).send({ origin: config.SERVER, payload: deletedUsers });
  } catch (error) {
    throw error;
  };
});
catchCall(router, "usuarios");

export default router;
