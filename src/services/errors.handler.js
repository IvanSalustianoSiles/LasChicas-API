import config, { errorDictionary } from "../config.js";

const errorHandler = (error, req, res, next) => {
    let customError = errorDictionary[0]; 
    for (const key in errorDictionary) {
        if (errorDictionary[key].code === error.type.code) customError = errorDictionary[key];
    };
    req.logger.error(`[ERROR[${customError.status}]::CODE[${customError.code}]: ${customError.message}` + ` (${error.message ? error.message : "NO_SPECIFIC_WARNING"}) | ::[${req.url ? req.url : "UNKNOWN_LOCATION"}]`);
    return res.status(customError.status).send({ origin: config.SERVER, error: `[ERROR[${customError.status}]::CODE[${customError.code}]: ${customError.message}` + ` (${error.message ? error.message : "NO_SPECIFIC_WARNING"})` });
};

export default errorHandler;