import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import { Persistencia } from '../../../persistencia/Persistencia';
import { CrearNodo } from '../crearNodo';
import { CrearArchivo } from '../CrearArchivo';
import { ActualizarContenidoArchivo } from '../ActualizarContenidoArchivo';

// Test de ActualizarContenidoArchivo: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const crearNodo = new CrearNodo(persistencia);
  const crearArchivo = new CrearArchivo(persistencia);
  const actualizar = new ActualizarContenidoArchivo(persistencia);

  const carpeta = await crearNodo.ejecutar({ nombre: 'Test ActualizarContenido', idPadre: 1 });
  const archivo = await crearArchivo.ejecutar({ nombre: 'a', extension: 'txt', rutaFisica: '/tmp/a.txt', tamanio: 10, idPadre: carpeta.id });

  try {
    console.log('--- Actualizar tamaño ---');
    const actualizado = await actualizar.ejecutar(archivo.id, 2048);
    console.log(actualizado);
    console.log(+actualizado.ultimaFechaModificacion > +archivo.ultimaFechaModificacion ? 'Fecha actualizada OK' : 'NO se actualizó la fecha');

    console.log('--- Tamaño 0 ---');
    console.log((await actualizar.ejecutar(archivo.id, 0)).tamanio);

    console.log('--- Tamaño negativo (no hay DTO que lo frene) ---');
    try {
      console.log('NO falló: tamaño guardado', (await actualizar.ejecutar(archivo.id, -1)).tamanio);
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Tamaño NaN ---');
    try {
      console.log('NO falló: tamaño guardado', (await actualizar.ejecutar(archivo.id, NaN)).tamanio);
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Tamaño decimal ---');
    try {
      console.log('NO falló: tamaño guardado', (await actualizar.ejecutar(archivo.id, 1.5)).tamanio);
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Id inexistente ---');
    try {
      console.log('NO falló:', await actualizar.ejecutar(999999, 10));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }
  } finally {
    await persistencia.ejecutar('DELETE FROM archivos WHERE id_padre = $1', [carpeta.id]);
    await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = $1', [carpeta.id]);
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
