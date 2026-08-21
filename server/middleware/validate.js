const { validateFields } = require("../utils/validateFields");

// Costruisce un middleware che valida una porzione della richiesta con una mappa
// di regole (vedi utils/validateFields.js) e risponde 400 col primo messaggio
// utile. In caso di successo la porzione viene sostituita dai valori ripuliti,
// così i controller ricevono dati già trimmati, convertiti e senza chiavi estranee.
const validatePart = (part, rules) => (req, res, next) => {
  const { errors, values } = validateFields(req[part], rules);

  if (errors.length > 0) {
    return res.status(400).json({ ok: false, error: errors[0] });
  }

  // req.query è un getter definito sul prototype di Express: riassegnarlo non
  // funziona, quindi si scrivono le proprietà sull'oggetto esistente.
  if (part === "body") {
    req.body = values;
  } else {
    Object.assign(req[part], values);
  }

  next();
};

const validate = (rules) => validatePart("body", rules);
const validateQuery = (rules) => validatePart("query", rules);
const validateParams = (rules) => validatePart("params", rules);

module.exports = { validate, validateQuery, validateParams };
