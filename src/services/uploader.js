import multer from "multer";
import config from "../config.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir;  
    if (file.fieldname === "products") {
      dir = config.UPLOAD_PRODUCTS_DIR
    } else if (file.fieldname === "profiles") {
      dir = config.UPLOAD_PROFILE_DIR
    } else {
      dir = config.UPLOAD_DOCS_DIR
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

export const uploader = multer({ storage: storage });
