const soap = require("soap");
const { PAGOS, SERVIDOR } = require("./config");

const comercioId = process.argv[2] || "TIENDA-001";
const URL = `http://${SERVIDOR.host}:${SERVIDOR.puerto}${SERVIDOR.ruta}?wsdl`;
const TNS = "http://banco.ejemplo.com/servicio";

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function describirFault(err) {
    const f = err.root && err.root.Envelope && err.root.Envelope.Body && err.root.Envelope.Body.Fault;
    if (!f) return err.message;
    const d = f.detail && f.detail.ErrorBancario;
    return `${f.faultcode}: ${f.faultstring}` + (d ? ` [${d.codigo}]` : "");
}

async function main() {
    let client;
    try {
        client = await soap.createClientAsync(URL);
    } catch (error) {
        console.error(`[Cliente ${comercioId}] No se pudo obtener el WSDL en ${URL}: ${error.message}`);
        console.error("¿Está corriendo el servidor? (node server.js)");
        process.exit(1);
    }
    client.addSoapHeader({ IdComercio: comercioId }, "", "tns", TNS);

    console.log(`[Cliente ${comercioId}] WSDL cargado. Operaciones: ` +
        Object.keys(client.describe().BancoService.BancoPort).join(", "));

    const resumen = { exitosos: 0, saldoInsuficiente: 0, fallas: 0 };
    const cuentasInvolucradas = new Set();

    for (const pago of PAGOS) {
        console.log(`\n[Cliente ${comercioId}] Pago #${pago.id} - ${pago.cliente}: $${pago.monto.toFixed(2)} ` +
            `(${pago.origen} -> ${pago.destino})`);

        try {
            // 1) ValidarSaldo
            const [val] = await client.ValidarSaldoAsync({ numeroCuenta: pago.origen, monto: pago.monto });
            console.log(`   ValidarSaldo -> ${val.resultado}`);
            cuentasInvolucradas.add(pago.origen); // la cuenta existe y tiene formato válido
            if (!val.resultado) {
                console.log("   Pago RECHAZADO: saldo insuficiente");
                resumen.saldoInsuficiente++;
                await dormir(200);
                continue;
            }

            // 2) EjecutarTransferencia
            const [tr] = await client.EjecutarTransferenciaAsync({
                cuentaOrigen: pago.origen,
                cuentaDestino: pago.destino,
                monto: pago.monto,
                tokenAutenticacion: pago.token,
            });
            console.log(`   EjecutarTransferencia -> OK, idTransaccion = ${tr.idTransaccion}`);
            cuentasInvolucradas.add(pago.destino);
            resumen.exitosos++;
        } catch (err) {
            console.log(`   SOAP-Fault -> ${describirFault(err)}`);
            resumen.fallas++;
        }
        await dormir(200 + Math.random() * 400); // simula el tiempo de procesamiento
    }

    // 3) ObtenerEstadoCuenta de las cuentas validadas
    console.log(`\n[Cliente ${comercioId}] Estado final de las cuentas:`);
    const filas = [];
    for (const numero of cuentasInvolucradas) {
        try {
            const [e] = await client.ObtenerEstadoCuentaAsync({ numeroCuenta: numero });
            filas.push({ cuenta: e.numeroCuenta, titular: e.titular, estado: e.estado, saldo: e.saldo });
        } catch (err) {
            console.log(`   ObtenerEstadoCuenta(${numero}) -> SOAP-Fault: ${describirFault(err)}`);
        }
    }
    console.table(filas);

    console.log(`[Cliente ${comercioId}] Resumen: ${resumen.exitosos} exitosos, ` +
        `${resumen.saldoInsuficiente} rechazados por saldo, ${resumen.fallas} con SOAP-Fault`);
    console.log(`[Cliente ${comercioId}] No hay más pagos, finalizando`);
}

main().then(() => process.exit(0));