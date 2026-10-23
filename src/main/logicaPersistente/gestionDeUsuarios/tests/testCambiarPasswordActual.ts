import bcrypt from 'bcrypt';
import type { Persistencia } from '../../persistencia/persistencia';
import { VerificarPassword } from '../../logicaPersistente/gestionDeUsuarios/verificarPassword';
import { CambiarPasswordActual } from '../../logicaPersistente/gestionDeUsuarios/cambiarPasswordActual';
import { cambiarPasswordActualSchema } from '../../logicaPersistente/gestionDeUsuarios/dto';


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


// Simula la base: el usuario 12 tiene la contraseña "Clave123", salvo que existe sea false.
async function crearPersistencia(existe = true) {
    const hash = await bcrypt.hash('Clave123', 4);
    const consultas: { sql: string; valores: unknown[] }[] = [];
    const persistencia = {
        async ejecutar(sql: string, valores: unknown[] = []) {
            consultas.push({ sql, valores });
            if (!sql.includes('SELECT')) return [];
            return existe ? [{ password_hash: hash }] : [];
        },
    } as unknown as Persistencia;
    return { persistencia, consultas };
}


const primerErrorDeValidacion = (datos: unknown): string => {
    const resultado = cambiarPasswordActualSchema.safeParse(datos);
    return resultado.success ? '' : resultado.error.issues[0].message;
};


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


    await caso(1, 'Cambiar contraseña con la actual correcta', 'Contraseña actualizada', async () => {
        const { persistencia, consultas } = await crearPersistencia();
        await new CambiarPasswordActual(new VerificarPassword(persistencia), persistencia).ejecutar({
            id: 12, passwordActual: 'Clave123', passwordNueva: 'Nueva456',
        });
        comprobar(consultas.length === 2, 'Se esperaban una lectura y una actualización');
        const actualizacion = consultas[1];
        comprobar(/UPDATE usuarios SET password_hash/.test(actualizacion.sql), 'No se actualizó la contraseña');
        comprobar(actualizacion.valores[1] === 12, 'El id de usuario no coincide');
        comprobar(await bcrypt.compare('Nueva456', String(actualizacion.valores[0])),
            'La contraseña nueva no se guardó como hash válido');
        return 'Contraseña actualizada';
    });


    await caso(2, 'Rechazar contraseña actual incorrecta sin actualizar', 'Error: La contraseña es incorrecta.', async () => {
        const { persistencia, consultas } = await crearPersistencia();
        await esperarError(
            () => new CambiarPasswordActual(new VerificarPassword(persistencia), persistencia).ejecutar({
                id: 12, passwordActual: 'Otra456', passwordNueva: 'Nueva456',
            }),
            'La contraseña es incorrecta.',
        );
        comprobar(consultas.length === 1, 'Se intentó actualizar aunque la actual era incorrecta');
        return 'Error: La contraseña es incorrecta.';
    });


    await caso(3, 'Rechazar usuario inexistente', 'Error: El usuario no existe.', async () => {
        const { persistencia, consultas } = await crearPersistencia(false);
        await esperarError(
            () => new CambiarPasswordActual(new VerificarPassword(persistencia), persistencia).ejecutar({
                id: 99, passwordActual: 'Clave123', passwordNueva: 'Nueva456',
            }),
            'El usuario no existe.',
        );
        comprobar(consultas.length === 1, 'Se intentó actualizar un usuario inexistente');
        return 'Error: El usuario no existe.';
    });


    await caso(4, 'Validar nueva contraseña sin mayúscula', 'La contraseña debe tener al menos una mayúscula.', async () => {
        return primerErrorDeValidacion({ id: 12, passwordActual: 'Clave123', passwordNueva: 'clave1234' });
    });


    await caso(5, 'Validar nueva contraseña sin número', 'La contraseña debe tener al menos un número.', async () => {
        return primerErrorDeValidacion({ id: 12, passwordActual: 'Clave123', passwordNueva: 'Clavexxxx' });
    });


    await caso(6, 'Validar nueva contraseña con menos de 8 caracteres', 'La contraseña debe tener al menos 8 caracteres.', async () => {
        return primerErrorDeValidacion({ id: 12, passwordActual: 'Clave123', passwordNueva: 'Cl1' });
    });


    await caso(7, 'Validar contraseña actual vacía', 'Ingresá tu contraseña actual.', async () => {
        return primerErrorDeValidacion({ id: 12, passwordActual: '', passwordNueva: 'Nueva456' });
    });


    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}


main().catch((error) => {
    console.error('MAL: Error al ejecutar las pruebas:', error);
    process.exitCode = 1;
});