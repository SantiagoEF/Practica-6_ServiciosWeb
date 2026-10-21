const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const soap = require("soap");
const { construirWsdl } = require("./wsdl");
const { CUENTAS, TOKENS, PAGOS, SERVIDOR } = require("./config");

const { host, puerto, ruta } = SERVIDOR;
const LOCATION = `http://${host}:${puerto}${ruta}`;

const cuentas = {};
for (const [numero, c] of Object.entries(CUENTAS)) {
    cuentas[numero] = { ...c, saldo: Math.round(c.saldo * 100), movimientos: [] };
}

console.log("   SERVIDOR BANCARIO SOAP - PASARELA DE PAGOS");
console.log(`Cuentas cargadas: ${Object.keys(cuentas).length}`);
console.log(`Pagos que se esperan atender: ${PAGOS.length}`);
console.log(`Puerto: ${puerto}`);

function fault(origen, codigo, mensaje) {
    return {
        Fault: {
            faultcode: origen === "cliente" ? "soap:Client" : "soap:Server",
            faultstring: mensaje,
            detail: { ErrorBancario: { codigo, mensaje } },
            statusCode: 500,
        },
    };
}
const aCentavos = (monto) => Math.round(monto * 100);
const pesos = (centavos) => (centavos / 100).toFixed(2);

function validarCuentaFormato(valor, campo) {
    if (typeof valor !== "string" || !/^[0-9]{10}$/.test(valor.trim()))
        throw fault("cliente", "FORMATO_INVALIDO", `El campo '${campo}' debe tener 10 dígitos numéricos`);
    return valor.trim();
}
function validarMonto(valor) {
    const n = Number(valor);
    if (!Number.isFinite(n) || n <= 0)
        throw fault("cliente", "MONTO_INVALIDO", "El campo 'monto' debe ser un número mayor a 0");
    return n;
}
function obtenerCuenta(numero) {
    const c = cuentas[numero];
    if (!c) throw fault("cliente", "CUENTA_INEXISTENTE", `La cuenta ${numero} no existe`);
    return c;
}

let pagosAtendidos = 0;
let conexionesActivas = 0;

function bitacora(operacion, headers, extra = "") {
    const comercio = headers && headers.IdComercio ? headers.IdComercio : "desconocido";
    console.log(`[Servidor][${comercio}] ${operacion} ${extra}`.trim());
}

const servicio = {
    BancoService: {
        BancoPort: {
            ValidarSaldo(args, _cb, headers) {
                pagosAtendidos++;
                bitacora("ValidarSaldo", headers, `cuenta=${args.numeroCuenta} monto=${args.monto}`);
                const numero = validarCuentaFormato(args.numeroCuenta, "numeroCuenta");
                const monto = validarMonto(args.monto);
                const cuenta = obtenerCuenta(numero);
                return { resultado: cuenta.saldo >= aCentavos(monto) };
            },

            EjecutarTransferencia(args, _cb, headers) {
                bitacora("EjecutarTransferencia", headers,
                    `${args.cuentaOrigen} -> ${args.cuentaDestino} monto=${args.monto}`);
                const origen = validarCuentaFormato(args.cuentaOrigen, "cuentaOrigen");
                const destino = validarCuentaFormato(args.cuentaDestino, "cuentaDestino");
                const monto = validarMonto(args.monto);
                const token = String(args.tokenAutenticacion || "").trim();

                if (origen === destino)
                    throw fault("cliente", "CUENTAS_IGUALES", "La cuenta origen y destino no pueden ser la misma");

                if (!TOKENS[token] || TOKENS[token] !== origen)
                    throw fault("cliente", "TOKEN_INVALIDO", "Token de autenticación inválido para la cuenta origen");

                const cOrigen = obtenerCuenta(origen);
                const cDestino = obtenerCuenta(destino);
                if (cOrigen.estado !== "ACTIVA")
                    throw fault("cliente", "CUENTA_BLOQUEADA", `La cuenta ${origen} está ${cOrigen.estado}`);
                if (cDestino.estado !== "ACTIVA")
                    throw fault("cliente", "CUENTA_BLOQUEADA", `La cuenta ${destino} está ${cDestino.estado}`);

                const centavos = aCentavos(monto);
                if (cOrigen.saldo < centavos)
                    throw fault("cliente", "SALDO_INSUFICIENTE", `Saldo insuficiente en la cuenta ${origen}`);

                const id = "TX-" + crypto.randomUUID();
                const fecha = new Date().toISOString();
                cOrigen.saldo -= centavos;
                cDestino.saldo += centavos;
                cOrigen.movimientos.push({ idTransaccion: id, tipo: "CARGO", monto: -monto, fecha });
                cDestino.movimientos.push({ idTransaccion: id, tipo: "ABONO", monto: monto, fecha });
                console.log(`[Servidor] Transferencia ${id} OK: $${pesos(centavos)} de ${origen} a ${destino}`);
                return { idTransaccion: id };
            },

            ObtenerEstadoCuenta(args, _cb, headers) {
                bitacora("ObtenerEstadoCuenta", headers, `cuenta=${args.numeroCuenta}`);
                const numero = validarCuentaFormato(args.numeroCuenta, "numeroCuenta");
                const c = obtenerCuenta(numero);
                return {
                    numeroCuenta: numero,
                    titular: c.titular,
                    tipoCuenta: c.tipo,
                    saldo: c.saldo / 100,
                    moneda: c.moneda,
                    estado: c.estado,
                    movimientos: c.movimientos.slice(-5),
                };
            },
        },
    },
};

const wsdlXml = construirWsdl(LOCATION);
fs.writeFileSync("banco.wsdl", wsdlXml);

const servidor = http.createServer((req, res) => {
    res.statusCode = 404;
    res.end("Use " + ruta + "?wsdl");
});
const instancia = soap.listen(servidor, { path: ruta, services: servicio, xml: wsdlXml });
instancia.log = (type, data) => {
    if (process.env.VERBOSE) console.log(`\n--- ${type.toUpperCase()} ---\n${data}\n`);
};

servidor.on("connection", (socket) => {
    conexionesActivas++;
    socket.on("close", () => {
        conexionesActivas--;
        if (conexionesActivas === 0 && pagosAtendidos >= PAGOS.length) {
            console.log("[Servidor] Todos los pagos fueron atendidos y no hay clientes conectados. Cerrando servidor...");
            servidor.close(() => console.log("[Servidor] Cerrado."));
        }
    });
});

servidor.listen(puerto, host, () => {
    console.log(`[Servidor] Escuchando en ${LOCATION}`);
    console.log(`[Servidor] WSDL disponible en ${LOCATION}?wsdl (guardado en ./banco.wsdl)`);
});