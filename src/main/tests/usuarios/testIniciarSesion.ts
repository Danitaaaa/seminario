import bcrypt from 'bcrypt';
import { pool, verifyDbConnection } from '../../persistencia/baseDeDatos';
import type { Persistencia } from '../../persistencia/Persistencia';
import { IniciarSesion } from '../../logicaPersistente/gestionDeUsuarios/iniciarSesion';


const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};
async function rechaza(accion: () => Promise<unknown>, mensaje: string): Promise<void> {
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
    const password = 'Correcto123!';
    const passwordHash = await bcrypt.hash(password, 4);
    const fila = (verificado = true) => ({
        id: 42, nombre: 'Alba', apellido: 'Agustina', apodo: 'Alba',
        email: 'alba@example.com', fecha_nacimiento: new Date('2000-01-01'),
        password_hash: passwordHash, email_verificado: verificado,
        embedding_facial: null, fecha_creacion: new Date('2026-01-01'),
    });
    const ejecutar = (usuario?: ReturnType<typeof fila>) => {
        const consultas: unknown[][] = [];
        const persistencia = {
            async ejecutar(sql: string, valores: unknown[] = []) {
                consultas.push([sql, valores]);
                return usuario ? [usuario] : [];
            },
        } as unknown as Persistencia;
        return { iniciar: new IniciarSesion(persistencia), consultas };
    };


    await caso(1, 'Iniciar sesión con credenciales válidas', 'Sesión iniciada para alba@example.com', async () => {
        const { iniciar, consultas } = ejecutar(fila());
        const usuario = await iniciar.ejecutar({ email: 'alba@example.com', password });
        comprobar(usuario.id === 42 && usuario.emailVerificado, 'Los datos del usuario no coinciden');
        comprobar(consultas.length === 1, 'Se esperaba una consulta');
        return `Sesión iniciada para ${usuario.email}`;
    });
    await caso(2, 'Iniciar sesión con usuario inexistente', 'Error: El usuario no existe', async () => {
        const { iniciar } = ejecutar();
        await rechaza(() => iniciar.ejecutar({ email: 'alba@example.com', password }), 'El usuario no existe');
        return 'Error: El usuario no existe';
    });
    await caso(3, 'Iniciar sesión con correo no verificado', 'Error: El email no está validado', async () => {
        const { iniciar } = ejecutar(fila(false));
        await rechaza(() => iniciar.ejecutar({ email: 'alba@example.com', password }), 'El email no está validado');
        return 'Error: El email no está validado';
    });
    await caso(4, 'Iniciar sesión con contraseña incorrecta', 'Error: La contraseña es incorrecta.', async () => {
        const { iniciar } = ejecutar(fila());
        await rechaza(() => iniciar.ejecutar({ email: 'alba@example.com', password: 'Incorrecta123!' }),
            'La contraseña es incorrecta.');
        return 'Error: La contraseña es incorrecta.';
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