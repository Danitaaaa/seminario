import bcrypt from 'bcrypt';
import { pool, verifyDbConnection } from '../../persistencia/baseDeDatos';
import type { Persistencia } from '../../persistencia/Persistencia';
import { CambiarPassword } from '../../logicaPersistente/gestionDeUsuarios/cambiarPassword';


const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};


async function esperarError(accion: () => Promise<unknown>, esperado: string): Promise<void> {
    try {
        await accion();
    } catch (error) {
        comprobar(error instanceof Error && error.message === esperado,
            `Se esperaba "${esperado}" y se recibió "${String(error)}"`);
        return;
    }
    throw new Error(`Se esperaba el error "${esperado}"`);
}


function crearPersistencia(verificado?: boolean) {
    const consultas: { sql: string; valores: unknown[] }[] = [];
    const persistencia = {
        async ejecutar(sql: string, valores: unknown[] = []) {
            consultas.push({ sql, valores });
            return sql.includes('SELECT') && verificado !== undefined
                ? [{ id: 12, email_verificado: verificado }]
                : [];
        },
    } as unknown as Persistencia;
    return { persistencia, consultas };
}


async function main(): Promise<void> {
    let bien = 0;
    let mal = 0;
    const caso = async (id: number, nombre: string, esperada: string, prueba: () => Promise<string>) => {
        console.log(`\nID: ${id}\nNombre: ${nombre}\nSalida esperada: ${esperada}`);
        try {
            const obtenida = await prueba();
            comprobar(obtenida === esperada, `Se obtuvo "${obtenida}"`);
            bien++;
            console.log(`Salida obtenida: ${obtenida}\nBIEN: ${nombre}`);
        } catch (error) {
            mal++;
            console.error(`Salida obtenida: ${String(error)}\nMAL: ${nombre}`);
        }
    };


    await caso(1, 'Cambiar contraseña de usuario verificado', 'Contraseña actualizada y código temporal eliminado', async () => {
        const { persistencia, consultas } = crearPersistencia(true);
        await new CambiarPassword(persistencia).ejecutar({
            email: 'alba@example.com', nuevaPassword: 'Nueva123!',
        });
        comprobar(consultas.length === 2, 'Se esperaban una consulta y una actualización');
        comprobar(/password_hash\s*=\s*\$1/.test(consultas[1].sql), 'No se actualizó el hash');
        comprobar(/codigo_verificacion\s*=\s*NULL/.test(consultas[1].sql), 'No se limpió el código');
        comprobar(/fecha_expiracion_codigo\s*=\s*NULL/.test(consultas[1].sql), 'No se limpió la expiración');
        comprobar(consultas[1].valores[1] === 12, 'El id de usuario no coincide');
        comprobar(await bcrypt.compare('Nueva123!', String(consultas[1].valores[0])),
            'La contraseña nueva no se almacenó como hash válido');
        return 'Contraseña actualizada y código temporal eliminado';
    });


    await caso(2, 'Cambiar contraseña de usuario inexistente', 'Error: Usuario no encontrado.', async () => {
        const { persistencia } = crearPersistencia();
        await esperarError(
            () => new CambiarPassword(persistencia).ejecutar({
                email: 'alba@example.com', nuevaPassword: 'Nueva123!',
            }),
            'Usuario no encontrado.',
        );
        return 'Error: Usuario no encontrado.';
    });


    await caso(3, 'Cambiar contraseña con correo no verificado', 'Error: El correo no está verificado.', async () => {
        const { persistencia } = crearPersistencia(false);
        await esperarError(
            () => new CambiarPassword(persistencia).ejecutar({
                email: 'alba@example.com', nuevaPassword: 'Nueva123!',
            }),
            'El correo no está verificado.',
        );
        return 'Error: El correo no está verificado.';
    });


    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}


async function ejecutar(): Promise<void> {
    try {
        await verifyDbConnection();
        await main();
    } catch (error) {
        console.error('MAL: Error al ejecutar las pruebas:', error);
        process.exitCode = 1;
    } finally {
        try {
            await pool.end();
        } catch (error) {
            console.error('MAL: Error al cerrar la conexión con PostgreSQL:', error);
            process.exitCode = 1;
        }
    }
}


void ejecutar();