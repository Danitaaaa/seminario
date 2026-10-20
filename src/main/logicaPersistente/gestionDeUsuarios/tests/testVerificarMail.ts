import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import type { Persistencia } from '../../../persistencia/Persistencia';
import { VerificarMail } from '../VerificarMail';


const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};
async function rechaza(accion: () => Promise<void>, mensaje: string): Promise<void> {
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
    const codigo = '123456', email = 'alba@example.com';
    const usuario = (cambios = {}) => ({
        codigo_verificacion: codigo,
        fecha_expiracion_codigo: new Date(Date.now() + 60_000),
        email_verificado: false,
        ...cambios,
    });
    const ejecutar = (fila?: ReturnType<typeof usuario>) => {
        const consultas: { sql: string; valores: unknown[] }[] = [];
        const persistencia = {
            async ejecutar(sql: string, valores: unknown[] = []) {
                consultas.push({ sql, valores });
                return sql.includes('UPDATE') ? [] : fila ? [fila] : [];
            },
        } as unknown as Persistencia;
        return { verificar: new VerificarMail(persistencia), consultas };
    };


    await caso(1, 'Verificar correo con código vigente', 'Correo verificado y código temporal eliminado', async () => {
        const { verificar, consultas } = ejecutar(usuario());
        await verificar.ejecutar(email, codigo);
        comprobar(consultas.length === 2, 'Se esperaban dos consultas');
        comprobar(/email_verificado\s*=\s*TRUE/.test(consultas[1].sql), 'No se verificó el correo');
        comprobar(/codigo_verificacion\s*=\s*NULL/.test(consultas[1].sql), 'No se limpió el código');
        comprobar(/fecha_expiracion_codigo\s*=\s*NULL/.test(consultas[1].sql), 'No se limpió la expiración');
        return 'Correo verificado y código temporal eliminado';
    });
    await caso(2, 'Verificar código con espacios externos', 'Código aceptado y correo verificado', async () => {
        const { verificar, consultas } = ejecutar(usuario());
        await verificar.ejecutar(email, ` ${codigo} `);
        comprobar(consultas.length === 2, 'No se actualizó el correo');
        return 'Código aceptado y correo verificado';
    });
    await caso(3, 'Verificar correo inexistente', 'Error: Usuario no encontrado', async () => {
        const { verificar } = ejecutar();
        await rechaza(() => verificar.ejecutar(email, codigo), 'Usuario no encontrado');
        return 'Error: Usuario no encontrado';
    });
    await caso(4, 'Verificar correo ya verificado', 'Error: El correo ya fue verificado', async () => {
        const { verificar } = ejecutar(usuario({ email_verificado: true }));
        await rechaza(() => verificar.ejecutar(email, codigo), 'El correo ya fue verificado');
        return 'Error: El correo ya fue verificado';
    });
    await caso(5, 'Verificar con código incorrecto', 'Error: Código incorrecto', async () => {
        const { verificar } = ejecutar(usuario());
        await rechaza(() => verificar.ejecutar(email, '654321'), 'Código incorrecto');
        return 'Error: Código incorrecto';
    });
    await caso(6, 'Verificar con código vencido', 'Error: El código ha expirado', async () => {
        const { verificar } = ejecutar(usuario({
            fecha_expiracion_codigo: new Date(Date.now() - 60_000),
        }));
        await rechaza(() => verificar.ejecutar(email, codigo), 'El código ha expirado');
        return 'Error: El código ha expirado';
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
