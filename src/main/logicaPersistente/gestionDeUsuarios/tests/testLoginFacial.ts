import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import { UsuarioFacialRepositorio, type EmbeddingGuardado } from '../../../persistencia/UsuarioFacialRepositorio';
import { LoginFacial } from '../LoginFacial';

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
    const obtenerOriginal = UsuarioFacialRepositorio.prototype.obtenerEmbeddings;
    try {
        await caso(1, 'Login facial con embedding inválido', 'Error: El embedding recibido no es válido', async () => {
            const r = await new LoginFacial().ejecutar([1, 2, 3]);
            if (r.exito === true) throw new Error('Se aceptó un embedding inválido');
            comprobar(r.mensaje === 'El embedding recibido no es válido', 'El mensaje no coincide');
            return `Error: ${r.mensaje}`;
        });
        await caso(2, 'Login facial sin rostros registrados', 'Error: Todavía no hay rostros registrados', async () => {
            UsuarioFacialRepositorio.prototype.obtenerEmbeddings = async () => [];
            const r = await new LoginFacial().ejecutar(Array(128).fill(0));
            if (r.exito === true) throw new Error('Se inició sesión sin rostros registrados');
            comprobar(r.mensaje === 'Todavía no hay rostros registrados', 'El mensaje no coincide');
            return `Error: ${r.mensaje}`;
        });
        await caso(3, 'Login facial con rostro reconocido', 'Login facial exitoso para usuario 42', async () => {
            UsuarioFacialRepositorio.prototype.obtenerEmbeddings = async (): Promise<EmbeddingGuardado[]> => [
                { usuarioId: 42, embedding: Array(128).fill(0.01) },
                { usuarioId: 43, embedding: Array(128).fill(0.2) },
            ];
            const r = await new LoginFacial().ejecutar(Array(128).fill(0));
            if (r.exito !== true) throw new Error('No se reconoció el rostro');
            comprobar(r.usuarioId === 42, 'No se eligió el rostro más cercano');
            return `Login facial exitoso para usuario ${r.usuarioId}`;
        });
        await caso(4, 'Login facial sin coincidencias', 'Error: No se reconoció el rostro', async () => {
            UsuarioFacialRepositorio.prototype.obtenerEmbeddings = async (): Promise<EmbeddingGuardado[]> => [
                { usuarioId: 42, embedding: Array(128).fill(0.1) },
            ];
            const r = await new LoginFacial().ejecutar(Array(128).fill(1));
            if (r.exito === true) throw new Error('Se reconoció un rostro distante');
            comprobar(r.mensaje === 'No se reconoció el rostro', 'El mensaje no coincide');
            return `Error: ${r.mensaje}`;
        });
    } finally {
        UsuarioFacialRepositorio.prototype.obtenerEmbeddings = obtenerOriginal;
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
