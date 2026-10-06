import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import type { Persistencia } from '../../../persistencia/Persistencia';
import { RegistrarUsuario } from '../RegistrarUsuario';

async function main(): Promise<void> {
    let bien = 0, mal = 0;
    const nombre = 'Registrar email existente';
    const esperada = 'Error: El email ya está registrado.';
    console.log(`ID: 1\nNombre: ${nombre}\nSalida esperada: ${esperada}`);
    let obtenida: string;
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
        obtenida = 'Registro duplicado aceptado';
    } catch (error) {
        obtenida = error instanceof Error && error.message === 'El email ya está registrado.'
            ? `Error: ${error.message}`
            : String(error);
    }
    if (obtenida === esperada) {
        bien++;
        console.log(`Salida obtenida: ${obtenida}\nBIEN: ${nombre}`);
    } else {
        mal++;
        console.error(`Salida obtenida: ${obtenida}\nMAL: ${nombre}`);
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
