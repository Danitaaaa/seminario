import bcrypt from 'bcrypt';
import { pool } from '../../persistencia/baseDeDatos';
import type { Persistencia } from '../../persistencia/persistencia';
import { VerificarPassword } from '../../logicaPersistente/gestionDeUsuarios/verificarPassword';
import { ActualizarRostro } from '../../logicaPersistente/gestionDeUsuarios/actualizarRostro';
import { RegistrarRostro } from '../../logicaPersistente/gestionDeUsuarios/registrarRostro';
import { actualizarRostroSchema } from '../../logicaPersistente/gestionDeUsuarios/dto';


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


// Simula la base: devuelve el hash de "Clave123" para el usuario 12, o nada si no existe.
async function crearPersistencia(existe = true) {
    const hash = await bcrypt.hash('Clave123', 4);
    return {
        async ejecutar() {
            return existe ? [{ password_hash: hash }] : [];
        },
    } as unknown as Persistencia;
}


// Reemplaza el guardado real del rostro para no tocar la base y saber si se llamó.
const llamadasRostro: { usuarioId: number; embedding: number[] }[] = [];
RegistrarRostro.prototype.ejecutar = async (usuarioId: number, embedding: number[]) => {
    llamadasRostro.push({ usuarioId, embedding });
    return { exito: true, mensaje: 'Rostro registrado correctamente' };
};

const embeddingValido = Array.from({ length: 128 }, (_, i) => i / 128);


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


    await caso(1, 'Verificar contraseña correcta', 'Contraseña aceptada', async () => {
        await new VerificarPassword(await crearPersistencia()).ejecutar({ id: 12, password: 'Clave123' });
        return 'Contraseña aceptada';
    });


    await caso(2, 'Verificar contraseña incorrecta', 'Error: La contraseña es incorrecta.', async () => {
        const verificar = new VerificarPassword(await crearPersistencia());
        await esperarError(() => verificar.ejecutar({ id: 12, password: 'Otra456' }), 'La contraseña es incorrecta.');
        return 'Error: La contraseña es incorrecta.';
    });


    await caso(3, 'Verificar contraseña de usuario inexistente', 'Error: El usuario no existe.', async () => {
        const verificar = new VerificarPassword(await crearPersistencia(false));
        await esperarError(() => verificar.ejecutar({ id: 99, password: 'Clave123' }), 'El usuario no existe.');
        return 'Error: El usuario no existe.';
    });


    await caso(4, 'Actualizar rostro con contraseña incorrecta', 'Error y el rostro no se guarda', async () => {
        llamadasRostro.length = 0;
        const actualizar = new ActualizarRostro(new VerificarPassword(await crearPersistencia()));
        await esperarError(
            () => actualizar.ejecutar({ id: 12, password: 'Otra456', embedding: embeddingValido }),
            'La contraseña es incorrecta.',
        );
        comprobar(llamadasRostro.length === 0, 'Se guardó el rostro aunque la contraseña era incorrecta');
        return 'Error y el rostro no se guarda';
    });


    await caso(5, 'Actualizar rostro con contraseña correcta', 'Rostro registrado correctamente', async () => {
        llamadasRostro.length = 0;
        const actualizar = new ActualizarRostro(new VerificarPassword(await crearPersistencia()));
        const resultado = await actualizar.ejecutar({ id: 12, password: 'Clave123', embedding: embeddingValido });
        comprobar(llamadasRostro.length === 1, 'No se guardó el rostro');
        comprobar(llamadasRostro[0].usuarioId === 12, 'El id de usuario no coincide');
        comprobar(llamadasRostro[0].embedding === embeddingValido, 'El rostro guardado no es el enviado');
        return resultado.mensaje;
    });


    await caso(6, 'Rechazar rostro con datos incompletos', 'El rostro capturado no es válido.', async () => {
        const resultado = actualizarRostroSchema.safeParse({ id: 12, password: 'Clave123', embedding: [0.1, 0.2] });
        comprobar(!resultado.success, 'Se aceptó un rostro incompleto');
        return resultado.success ? '' : resultado.error.issues[0].message;
    });


    await caso(7, 'Rechazar contraseña vacía', 'Ingresá tu contraseña.', async () => {
        const resultado = actualizarRostroSchema.safeParse({ id: 12, password: '', embedding: embeddingValido });
        comprobar(!resultado.success, 'Se aceptó una contraseña vacía');
        return resultado.success ? '' : resultado.error.issues[0].message;
    });


    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}


async function ejecutar(): Promise<void> {
    try {
        await main();
    } catch (error) {
        console.error('MAL: Error al ejecutar las pruebas:', error);
        process.exitCode = 1;
    } finally {
        await pool.end().catch(() => {});
    }
}


void ejecutar();