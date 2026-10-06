import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import type { Persistencia } from '../../../persistencia/Persistencia';
import { ValidarCodigo } from '../ValidarCodigo';

const comprobar = (ok: boolean, mensaje: string) => { if (!ok) throw new Error(mensaje); };
async function esperarError(fn: () => Promise<unknown>, mensaje: string): Promise<void> {
    try { await fn(); } catch (e) {
        comprobar(e instanceof Error && e.message === mensaje, `Se esperaba "${mensaje}"`);
        return;
    }
    throw new Error(`No se recibió "${mensaje}"`);
}
async function main() {
    let bien = 0, mal = 0;
    const caso = async (id: number, nombre: string, esperado: string, fn: () => Promise<string>) => {
        console.log(`\nID: ${id}\nNombre: ${nombre}\nSalida esperada: ${esperado}`);
        try {
            const obtenido = await fn();
            comprobar(obtenido === esperado, `Se recibió "${obtenido}"`);
            bien++;
            console.log(`Salida obtenida: ${obtenido}\nBIEN: ${nombre}`);
        } catch (e) { mal++; console.error(`Salida obtenida: ${String(e)}\nMAL: ${nombre}`); }
    };
    const fila = (vence = Date.now() + 60_000) => ({
        id: 12, codigo_verificacion: '123456', fecha_expiracion_codigo: new Date(vence),
    });
    const crear = (usuario?: ReturnType<typeof fila>) => new ValidarCodigo({
        async ejecutar() { return usuario ? [usuario] : []; },
    } as unknown as Persistencia);
    const datos = { email: 'alba@example.com', codigo: '123456' };

    await caso(1, 'Validar código correcto y vigente', 'Código válido', async () => {
        await crear(fila()).ejecutar(datos);
        return 'Código válido';
    });
    await caso(2, 'Validar código de correo no registrado', 'Error: El correo no está registrado.', async () => {
        await esperarError(() => crear().ejecutar(datos), 'El correo no está registrado.');
        return 'Error: El correo no está registrado.';
    });
    await caso(3, 'Validar código incorrecto', 'Error: Código incorrecto.', async () => {
        await esperarError(() => crear(fila()).ejecutar({ ...datos, codigo: '654321' }), 'Código incorrecto.');
        return 'Error: Código incorrecto.';
    });
    await caso(4, 'Validar código vencido', 'Error: El código ha expirado.', async () => {
        await esperarError(() => crear(fila(Date.now() - 60_000)).ejecutar(datos), 'El código ha expirado.');
        return 'Error: El código ha expirado.';
    });
    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}
void (async () => {
    try { await verifyDbConnection(); await main(); }
    catch (e) { console.error('MAL: Error al ejecutar las pruebas:', e); process.exitCode = 1; }
    finally { try { await pool.end(); } catch (e) { console.error('MAL: Error al cerrar PostgreSQL:', e); process.exitCode = 1; } }
})();
