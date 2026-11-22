import type { Persistencia } from '../../persistencia/persistencia';
import { ModificarPerfil } from '../../logicaPersistente/gestionDeUsuarios/modificarPerfil';

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

// Simula la base: la primera consulta busca el correo repetido y la segunda hace el UPDATE.
function persistenciaFalsa(correoEnUso: boolean, existe = true) {
    const persistencia = {
        async ejecutar(sql: string, valores: unknown[] = []) {
            if (sql.includes('SELECT 1')) return correoEnUso ? [{ '?column?': 1 }] : [];
            if (!existe) return [];
            return [{
                id_usuario: valores[3], nombre: valores[0], apellido: valores[1],
                apodo: 'Dani', email: valores[2], tiene_rostro: true,
            }];
        },
    } as unknown as Persistencia;
    return persistencia;
}

const datos = { id: 1, nombre: 'Dana', apellido: 'Diez Gomez', email: 'dana@example.com' };

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

    await caso(1, 'Modificar nombre, apellido y correo', 'Dana Diez Gomez │ dana@example.com │ apodo Dani', async () => {
        const perfil = await new ModificarPerfil(persistenciaFalsa(false)).ejecutar(datos);
        return `${perfil.nombre} ${perfil.apellido} │ ${perfil.email} │ apodo ${perfil.apodo}`;
    });

    await caso(2, 'Rechazar un correo que ya usa otro usuario', 'Error: Ese correo ya está en uso.', async () => {
        await esperarError(() => new ModificarPerfil(persistenciaFalsa(true)).ejecutar(datos), 'Ese correo ya está en uso.');
        return 'Error: Ese correo ya está en uso.';
    });

    await caso(3, 'Modificar un usuario que no existe', 'Error: El usuario no existe.', async () => {
        await esperarError(() => new ModificarPerfil(persistenciaFalsa(false, false)).ejecutar({ ...datos, id: 99 }),
            'El usuario no existe.');
        return 'Error: El usuario no existe.';
    });

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}

main().catch((error) => {
    console.error('MAL: Error al ejecutar las pruebas:', error);
    process.exitCode = 1;
});
