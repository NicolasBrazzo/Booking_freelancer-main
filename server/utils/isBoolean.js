// I flag (is_active) devono essere booleani veri: la stringa "false" arrivata
// da un client scritto male sarebbe truthy e verrebbe salvata come true.
const isBoolean = (value) => typeof value === "boolean";

module.exports = { isBoolean };
