// Barrel: import unico per i validatori lato server.
//   const { validateEmail, isValidText } = require("../utils/validators");
// Speculare a client/src/utils/validators/index.js.
const { validateEmail } = require("./validateEmail");
const { validateName } = require("./validateName");
const { validatePhoneNumber } = require("./validatePhoneNumber");
const { isValidText } = require("./isValidText");
const { isValidDuration } = require("./isValidDuration");
const { isValidPrice } = require("./isValidPrice");
const { isValidDate } = require("./isValidDate");
const { isValidTime } = require("./isValidTime");
const { isValidUuid } = require("./isValidUuid");
const { isValidHexColor } = require("./isValidHexColor");
const { isOneOf } = require("./isOneOf");
const { isBoolean } = require("./isBoolean");
const { validateFields } = require("./validateFields");

module.exports = {
  validateEmail,
  validateName,
  validatePhoneNumber,
  isValidText,
  isValidDuration,
  isValidPrice,
  isValidDate,
  isValidTime,
  isValidUuid,
  isValidHexColor,
  isOneOf,
  isBoolean,
  validateFields,
};
