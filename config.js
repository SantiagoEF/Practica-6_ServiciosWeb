const CUENTAS = {
    "1000000001": { titular: "Juan Pérez",             tipo: "AHORRO",  saldo: 15000.50, moneda: "MXN", estado: "ACTIVA" },
    "1000000002": { titular: "Tienda El Buen Precio",  tipo: "CHEQUES", saldo: 82000.00, moneda: "MXN", estado: "ACTIVA" },
    "1000000003": { titular: "María López",            tipo: "AHORRO",  saldo: 300.00,   moneda: "MXN", estado: "ACTIVA" },
    "1000000004": { titular: "Carlos Ruiz",            tipo: "AHORRO",  saldo: 5000.00,  moneda: "MXN", estado: "BLOQUEADA" },
    "1000000005": { titular: "Ana Torres",             tipo: "AHORRO",  saldo: 22000.00, moneda: "MXN", estado: "ACTIVA" },
};

// Token -> cuenta a la que autoriza cargar
const TOKENS = {
    "TKN-JUAN-2026":   "1000000001",
    "TKN-MARIA-2026":  "1000000003",
    "TKN-CARLOS-2026": "1000000004",
    "TKN-ANA-2026":    "1000000005",
};

const CUENTA_TIENDA = "1000000002";

// Pagos que la tienda debe cobrar (algunos fallan a propósito para ver los SOAP-Fault)
const PAGOS = [
    { id: 1,  cliente: "Juan",   origen: "1000000001", destino: CUENTA_TIENDA, monto: 1200.00,  token: "TKN-JUAN-2026" },    // OK
    { id: 2,  cliente: "María",  origen: "1000000003", destino: CUENTA_TIENDA, monto: 150.00,   token: "TKN-MARIA-2026" },   // OK
    { id: 3,  cliente: "Carlos", origen: "1000000004", destino: CUENTA_TIENDA, monto: 100.00,   token: "TKN-CARLOS-2026" },  // Fault: cuenta bloqueada
    { id: 4,  cliente: "Ana",    origen: "1000000005", destino: CUENTA_TIENDA, monto: 25000.00, token: "TKN-ANA-2026" },     // Saldo insuficiente (ValidarSaldo = false)
    { id: 5,  cliente: "Juan",   origen: "1000000001", destino: CUENTA_TIENDA, monto: 50.00,    token: "TOKEN-FALSO" },      // Fault: token inválido
    { id: 6,  cliente: "María",  origen: "1000000003", destino: "9999999999",  monto: 20.00,    token: "TKN-MARIA-2026" },   // Fault: cuenta destino inexistente
    { id: 7,  cliente: "Ana",    origen: "1000000005", destino: CUENTA_TIENDA, monto: 3500.75,  token: "TKN-ANA-2026" },     // OK
    { id: 8,  cliente: "Juan",   origen: "1000000001", destino: CUENTA_TIENDA, monto: 800.00,   token: "TKN-JUAN-2026" },    // OK
    { id: 9,  cliente: "María",  origen: "1000000003", destino: CUENTA_TIENDA, monto: 500.00,   token: "TKN-MARIA-2026" },   // Saldo insuficiente (ya gastó 150)
    { id: 10, cliente: "Pedro",  origen: "12345",      destino: CUENTA_TIENDA, monto: 10.00,    token: "TKN-PEDRO-2026" },   // Fault: formato de cuenta inválido
];

const SERVIDOR = { host: "127.0.0.1", puerto: 8000, ruta: "/banco" };

module.exports = { CUENTAS, TOKENS, CUENTA_TIENDA, PAGOS, SERVIDOR };