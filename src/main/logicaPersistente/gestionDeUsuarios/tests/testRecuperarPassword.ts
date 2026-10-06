import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import type { Persistencia } from '../../../persistencia/Persistencia';
import { RecuperarPassword } from '../RecuperarPassword';

const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};
async function rechaza(accion: () => Promise<unknown>, mensaje: string): Promise<void> {
    try { await accion(); } catch (e) {
        comprobar(e instanceof Error && e.message === mensaje, `Se esperaba "${mensaje}"`);
        return;
    }
    throw new Error(`No se recibió "${mensaje}"`);
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
        } catch (e) { mal++; console.error(`Salida obtenida: ${String(e)}\nMAL: ${nombre}`); }
    };
    const crear = (usuario?: { id: number; email_verificado: boolean }) => {
        const consultas: string[] = [];
        const persistencia = {
            async ejecutar(sql: string) { consultas.push(sql); return usuario ? [usuario] : []; },
        } as unknown as Persistencia;
        return { recuperar: new RecuperarPassword(persistencia), consultas };
    };

    await caso(1, 'Recuperar contraseña de usuario inexistente', 'Error: Usuario no encontrado.', async () => {
        const { recuperar } = crear();
        await rechaza(() => recuperar.ejecutar({ email: 'alba@example.com' }), 'Usuario no encontrado.');
        return 'Error: Usuario no encontrado.';
    });
    await caso(2, 'Recuperar contraseña con correo no verificado', 'Error: El correo no está verificado.', async () => {
        const { recuperar, consultas } = crear({ id: 12, email_verificado: false });
        await rechaza(() => recuperar.ejecutar({ email: 'alba@example.com' }), 'El correo no está verificado.');
        comprobar(consultas.length === 1, 'No debía generar ni enviar un código');
        return 'Error: El correo no está verificado.';
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
