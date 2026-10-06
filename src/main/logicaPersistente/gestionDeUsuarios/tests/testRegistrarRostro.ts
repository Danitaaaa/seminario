import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import { UsuarioFacialRepositorio } from '../../../persistencia/UsuarioFacialRepositorio';
import { RegistrarRostro } from '../RegistrarRostro';

const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};
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
    const guardarOriginal = UsuarioFacialRepositorio.prototype.guardarEmbedding;
    try {
        await caso(1, 'Registrar embedding facial inválido', 'Error: El embedding recibido no es válido', async () => {
            const r = await new RegistrarRostro().ejecutar(12, [1, 2, 3]);
            comprobar(!r.exito && r.mensaje === 'El embedding recibido no es válido', 'Se aceptó un embedding inválido');
            return `Error: ${r.mensaje}`;
        });
        await caso(2, 'Registrar embedding facial válido', 'Rostro registrado correctamente', async () => {
            let idGuardado = 0;
            UsuarioFacialRepositorio.prototype.guardarEmbedding = async (id) => {
                idGuardado = id;
                return true;
            };
            const r = await new RegistrarRostro().ejecutar(42, Array(128).fill(0.25));
            comprobar(r.exito && idGuardado === 42, 'No se guardó el embedding del usuario esperado');
            return r.mensaje;
        });
        await caso(3, 'Registrar rostro para usuario inexistente', 'Error: No se encontró el usuario', async () => {
            UsuarioFacialRepositorio.prototype.guardarEmbedding = async () => false;
            const r = await new RegistrarRostro().ejecutar(999, Array(128).fill(0.25));
            comprobar(!r.exito && r.mensaje === 'No se encontró el usuario', 'El resultado no coincide');
            return `Error: ${r.mensaje}`;
        });
    } finally {
        UsuarioFacialRepositorio.prototype.guardarEmbedding = guardarOriginal;
    }
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
