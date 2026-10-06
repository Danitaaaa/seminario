import bcrypt from 'bcrypt';
import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import type { Persistencia } from '../../../persistencia/Persistencia';
import { IniciarSesion } from '../IniciarSesion';

const ok = (condicion: boolean, mensaje: string) => { if (!condicion) throw new Error(mensaje); };
async function errorEsperado(fn: () => Promise<unknown>, mensaje: string) {
    try { await fn(); } catch (e) {
        ok(e instanceof Error && e.message === mensaje, `Se esperaba "${mensaje}"`);
        return;
    }
    throw new Error(`No se recibió "${mensaje}"`);
}
async function main() {
    let bien = 0, mal = 0;
    const caso = async (id: number, nombre: string, esperada: string, fn: () => Promise<string>) => {
        console.log(`\nID: ${id}\nNombre: ${nombre}\nSalida esperada: ${esperada}`);
        try {
            const obtenida = await fn();
            ok(obtenida === esperada, `Se recibió "${obtenida}"`);
            bien++;
            console.log(`Salida obtenida: ${obtenida}\nBIEN: ${nombre}`);
        } catch (e) { mal++; console.error(`Salida obtenida: ${String(e)}\nMAL: ${nombre}`); }
    };
    const hash = await bcrypt.hash('Correcto123!', 4);
    const fila = (verificado = true) => ({
        id: 42, nombre: 'Alba', apellido: 'Agustina', apodo: 'Alba',
        email: 'alba@example.com', fecha_nacimiento: new Date('2000-01-01'),
        password_hash: hash, email_verificado: verificado,
        embedding_facial: null, fecha_creacion: new Date('2026-01-01'),
    });
    const crear = (usuario?: ReturnType<typeof fila>) => {
        const persistencia = {
            async ejecutar() { return usuario ? [usuario] : []; },
        } as unknown as Persistencia;
        return new IniciarSesion(persistencia);
    };

    await caso(1, 'Iniciar sesión con credenciales válidas',
        'Sesión iniciada para alba@example.com', async () => {
            const usuario = await crear(fila()).ejecutar({ email: 'alba@example.com', password: 'Correcto123!' });
            ok(usuario.id === 42 && usuario.emailVerificado, 'Los datos del usuario no coinciden');
            return `Sesión iniciada para ${usuario.email}`;
        });
    await caso(2, 'Iniciar sesión con usuario inexistente', 'Error: El usuario no existe', async () => {
        await errorEsperado(() => crear().ejecutar({ email: 'alba@example.com', password: 'Correcto123!' }), 'El usuario no existe');
        return 'Error: El usuario no existe';
    });
    await caso(3, 'Iniciar sesión con correo no verificado', 'Error: El email no está validado', async () => {
        await errorEsperado(() => crear(fila(false)).ejecutar({ email: 'alba@example.com', password: 'Correcto123!' }), 'El email no está validado');
        return 'Error: El email no está validado';
    });
    await caso(4, 'Iniciar sesión con contraseña incorrecta', 'Error: La contraseña es incorrecta.', async () => {
        await errorEsperado(() => crear(fila()).ejecutar({ email: 'alba@example.com', password: 'Incorrecta123!' }), 'La contraseña es incorrecta.');
        return 'Error: La contraseña es incorrecta.';
    });
    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}
void (async () => {
    try { await verifyDbConnection(); await main(); }
    catch (e) { console.error('MAL: Error al ejecutar las pruebas:', e); process.exitCode = 1; }
    finally { try { await pool.end(); } catch (e) { console.error('MAL: Error al cerrar PostgreSQL:', e); process.exitCode = 1; } }
})();
