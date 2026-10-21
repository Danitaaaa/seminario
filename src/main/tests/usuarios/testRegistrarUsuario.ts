import { pool, verifyDbConnection } from '../../persistencia/BaseDeDatos';
import type { Persistencia } from '../../persistencia/Persistencia';
import { RegistrarUsuario } from '../../logicaPersistente/gestionDeUsuarios/RegistrarUsuario';


async function main(): Promise<void> {
    let bien = 0, mal = 0;
    try {
        const consultas: string[] = [];
        const persistencia = {
            async ejecutar(sql: string) { consultas.push(sql); return [{ id: 12 }]; },
        } as unknown as Persistencia;
        await new RegistrarUsuario(persistencia).ejecutar({
            nombre: 'Alba', apellido: 'Heredia', apodo: 'Alba',
            email: 'alba@example.com', fechaNacimiento: new Date('2000-01-01'),
            password: 'Correcta123!',
        });
        throw new Error('Se permitió registrar un email existente');
    } catch (error) {
        if (error instanceof Error && error.message === 'El email ya está registrado.') {
            bien++;
            console.log('ID: 1\nNombre: Registrar email existente\nSalida esperada: Error: El email ya está registrado.\nSalida obtenida: Error: El email ya está registrado.\nBIEN: Registrar email existente');
        } else {
            mal++;
            console.error(`ID: 1\nNombre: Registrar email existente\nSalida esperada: Error: El email ya está registrado.\nSalida obtenida: ${String(error)}\nMAL: Registrar email existente`);
        }
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
