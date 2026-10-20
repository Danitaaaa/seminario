import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import type { Persistencia } from '../../../persistencia/Persistencia';
import { ValidarCodigo } from '../ValidarCodigo';


const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};
async function rechaza(accion: () => Promise<unknown>, mensaje: string): Promise<void> {
    let error: unknown;
    try { await accion(); } catch (e) { error = e; }
    comprobar(error instanceof Error && error.message === mensaje, `Se esperaba "${mensaje}"`);
}
async function main(): Promise<void> {
    let bien = 0, mal = 0;
    const caso = async (id: number, nombre: string, esperada: string, fn: () => Promise<string>) => {
        console.log(`\nID: ${id}\nNombre: ${nombre}\nSalida esperada: ${esperada}`);
        try {
            const obtenida = await fn();
            comprobar(obtenida === esperada, `Se obtuvo "${obtenida}"`);
            bien++;
            console.log(`Salida obtenida: ${obtenida}\nBIEN: ${nombre}`);
        } catch (e) {
            mal++;
            console.error(`Salida obtenida: ${String(e)}\nMAL: ${nombre}`);
        }
    };
    const usuario = (expira = Date.now() + 60_000) => ({
        id: 12, codigo_verificacion: '123456', fecha_expiracion_codigo: new Date(expira),
    });
    const crear = (fila?: ReturnType<typeof usuario>) => {
        const persistencia = {
            async ejecutar() { return fila ? [fila] : []; },
        } as unknown as Persistencia;
        return new ValidarCodigo(persistencia);
    };
    const datos = { email: 'alba@example.com', codigo: '123456' };


    await caso(1, 'Validar código correcto y vigente', 'Código válido', async () => {
        await crear(usuario()).ejecutar(datos);
        return 'Código válido';
    });
    await caso(2, 'Validar código de correo no registrado', 'Error: El correo no está registrado.', async () => {
        await rechaza(() => crear().ejecutar(datos), 'El correo no está registrado.');
        return 'Error: El correo no está registrado.';
    });
    await caso(3, 'Validar código incorrecto', 'Error: Código incorrecto.', async () => {
        await rechaza(() => crear(usuario()).ejecutar({ ...datos, codigo: '654321' }), 'Código incorrecto.');
        return 'Error: Código incorrecto.';
    });
    await caso(4, 'Validar código vencido', 'Error: El código ha expirado.', async () => {
        await rechaza(() => crear(usuario(Date.now() - 60_000)).ejecutar(datos), 'El código ha expirado.');
        return 'Error: El código ha expirado.';
    });
    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}
async function ejecutar(): Promise<void> {
    try { await verifyDbConnection(); await main(); }
    catch (e) { console.error('MAL: Error al ejecutar las pruebas:', e); process.exitCode = 1; }
    finally {
        try { await pool.end(); }
        catch (e) { console.error('MAL: Error al cerrar PostgreSQL:', e); process.exitCode = 1; }
    }
}
void ejecutar();