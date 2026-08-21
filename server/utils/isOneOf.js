// Campi con un insieme chiuso di valori ammessi (colori, layout, status).
const isOneOf = (value, allowed) => allowed.includes(value);

module.exports = { isOneOf };
