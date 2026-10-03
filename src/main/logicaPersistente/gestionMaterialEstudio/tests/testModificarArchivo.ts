import { pool, verifyDbConnection } from '../../../persistencia/baseDeDatos';
import { Persistencia } from '../../../persistencia/persistencia';
import { CrearNodo } from '../crearNodo';
import { CrearArchivo } from '../crearArchivo';
import { ModificarArchivo } from '../modificarArchivo';
import { EntornoArchivos } from './entornoTest';

// Test de ModificarArchivo: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const entorno = new EntornoArchivos();
  const crearNodo = new CrearNodo(persistencia);
  const crearArchivo = new CrearArchivo(persistencia, entorno.almacenamiento);
  const modificarArchivo = new ModificarArchivo(persistencia);

  const carpeta = await crearNodo.ejecutar({ nombre: 'Test ModificarArchivo', idPadre: 1 });

  try {
    const base = { extension: 'pdf', idPadre: carpeta.id };
    const a = await crearArchivo.ejecutar({ ...base, nombre: 'a', rutaFisica: entorno.origen(10) });
    await crearArchivo.ejecutar({ ...base, nombre: 'b', rutaFisica: entorno.origen(10) });

    console.log('--- Renombrar ---');
    const renombrado = await modificarArchivo.ejecutar({ id: a.id, nombre: 'a renombrado' });
    console.log(renombrado);
    console.log(+renombrado.ultimaFechaModificacion > +a.ultimaFechaModificacion ? 'Fecha actualizada OK' : 'NO se actualizó la fecha');
    console.log(renombrado.rutaFisica === a.rutaFisica ? 'La ruta física no cambió OK' : 'CAMBIÓ la ruta física');

    console.log('--- Renombrar con el nombre de otro archivo de la carpeta (debería fallar) ---');
    try {
      console.log('NO falló:', await modificarArchivo.ejecutar({ id: a.id, nombre: 'b' }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Nombre vacío ---');
    try {
      console.log('NO falló: permite nombre vacío', await modificarArchivo.ejecutar({ id: a.id, nombre: '' }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Nombre de 256 caracteres ---');
    try {
      console.log('NO falló:', await modificarArchivo.ejecutar({ id: a.id, nombre: 'a'.repeat(256) }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Id inexistente ---');
    try {
      console.log('NO falló:', await modificarArchivo.ejecutar({ id: 999999, nombre: 'nada' }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }
  } finally {
    await persistencia.ejecutar('DELETE FROM archivos WHERE id_padre = $1', [carpeta.id]);
    await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = $1', [carpeta.id]);
    entorno.limpiar();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});