import bcrypt from 'bcrypt';
import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import type { Persistencia } from '../../../persistencia/Persistencia';
import { CambiarPassword } from '../CambiarPassword';

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
    const crear = (verificado?: boolean) => {
        const consultas: { sql: string; valores: unknown[] }[] = [];
        const persistencia = {
            async ejecutar(sql: string, valores: unknown[] = []) {
                consultas.push({ sql, valores });
                return sql.includes('SELECT') && verificado !== undefined ? [{ id: 12, email_verificado: verificado }] : [];
            },
        } as unknown as Persistencia;
        return { caso: new CambiarPassword(persistencia), consultas };
    };

    await caso(1, 'Cambiar contraseña de usuario verificado', 'Contraseña actualizada y código eliminado', async () => {
        const { caso: cambiar, consultas } = crear(true);
        await cambiar.ejecutar({ email: 'alba@example.com', nuevaPassword: 'Nueva123!' });
        comprobar(consultas.length === 2, 'Faltó consultar o actualizar');
        comprobar(/password_hash\s*=\s*\$1/.test(consultas[1].sql), 'No se actualizó el hash');
        comprobar(/codigo_verificacion\s*=\s*NULL/.test(consultas[1].sql) &&
            /fecha_expiracion_codigo\s*=\s*NULL/.test(consultas[1].sql), 'No se limpió el código');
        comprobar(consultas[1].valores[1] === 12 &&
            await bcrypt.compare('Nueva123!', String(consultas[1].valores[0])), 'Los datos actualizados no coinciden');
        return 'Contraseña actualizada y código eliminado';
    });
    await caso(2, 'Cambiar contraseña de usuario inexistente', 'Error: Usuario no encontrado.', async () => {
        await esperarError(() => crear().caso.ejecutar({ email: 'alba@example.com', nuevaPassword: 'Nueva123!' }), 'Usuario no encontrado.');
        return 'Error: Usuario no encontrado.';
    });
    await caso(3, 'Cambiar contraseña con correo no verificado', 'Error: El correo no está verificado.', async () => {
        await esperarError(() => crear(false).caso.ejecutar({ email: 'alba@example.com', nuevaPassword: 'Nueva123!' }), 'El correo no está verificado.');
        return 'Error: El correo no está verificado.';
    });
    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}
void (async () => {
    try { await verifyDbConnection(); await main(); }
    catch (e) { console.error('MAL: Error al ejecutar las pruebas:', e); process.exitCode = 1; }
    finally { try { await pool.end(); } catch (e) { console.error('MAL: Error al cerrar PostgreSQL:', e); process.exitCode = 1; } }
})();
