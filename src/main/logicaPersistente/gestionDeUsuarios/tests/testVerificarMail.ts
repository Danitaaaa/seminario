import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import type { Persistencia } from '../../../persistencia/Persistencia';
import { VerificarMail } from '../VerificarMail';

const ok = (condicion: boolean, mensaje: string) => { if (!condicion) throw new Error(mensaje); };
async function errorEsperado(fn: () => Promise<void>, mensaje: string) {
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
    const codigo = '123456', email = 'alba@example.com';
    const fila = (cambios = {}) => ({
        codigo_verificacion: codigo,
        fecha_expiracion_codigo: new Date(Date.now() + 60_000),
        email_verificado: false, ...cambios,
    });
    const crear = (usuario?: ReturnType<typeof fila>) => {
        const consultas: { sql: string; valores: unknown[] }[] = [];
        const persistencia = {
            async ejecutar(sql: string, valores: unknown[] = []) {
                consultas.push({ sql, valores });
                return sql.includes('UPDATE') ? [] : usuario ? [usuario] : [];
            },
        } as unknown as Persistencia;
        return { verificar: new VerificarMail(persistencia), consultas };
    };

    await caso(1, 'Verificar correo con código vigente', 'Correo verificado y código temporal eliminado', async () => {
        const { verificar, consultas } = crear(fila());
        await verificar.ejecutar(email, codigo);
        ok(consultas.length === 2 && /email_verificado\s*=\s*TRUE/.test(consultas[1].sql), 'No se verificó el correo');
        ok(/codigo_verificacion\s*=\s*NULL/.test(consultas[1].sql) && /fecha_expiracion_codigo\s*=\s*NULL/.test(consultas[1].sql), 'No se limpiaron los datos del código');
        return 'Correo verificado y código temporal eliminado';
    });
    await caso(2, 'Verificar código con espacios externos', 'Código aceptado y correo verificado', async () => {
        const { verificar } = crear(fila());
        await verificar.ejecutar(email, ` ${codigo} `);
        return 'Código aceptado y correo verificado';
    });
    await caso(3, 'Verificar correo inexistente', 'Error: Usuario no encontrado', async () => {
        await errorEsperado(() => crear().verificar.ejecutar(email, codigo), 'Usuario no encontrado');
        return 'Error: Usuario no encontrado';
    });
    await caso(4, 'Verificar correo ya verificado', 'Error: El correo ya fue verificado', async () => {
        await errorEsperado(() => crear(fila({ email_verificado: true })).verificar.ejecutar(email, codigo), 'El correo ya fue verificado');
        return 'Error: El correo ya fue verificado';
    });
    await caso(5, 'Verificar con código incorrecto', 'Error: Código incorrecto', async () => {
        await errorEsperado(() => crear(fila()).verificar.ejecutar(email, '654321'), 'Código incorrecto');
        return 'Error: Código incorrecto';
    });
    await caso(6, 'Verificar con código vencido', 'Error: El código ha expirado', async () => {
        await errorEsperado(() => crear(fila({ fecha_expiracion_codigo: new Date(Date.now() - 60_000) })).verificar.ejecutar(email, codigo), 'El código ha expirado');
        return 'Error: El código ha expirado';
    });
    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}
void (async () => {
    try { await verifyDbConnection(); await main(); }
    catch (e) { console.error('MAL: Error al ejecutar las pruebas:', e); process.exitCode = 1; }
    finally { try { await pool.end(); } catch (e) { console.error('MAL: Error al cerrar PostgreSQL:', e); process.exitCode = 1; } }
})();
