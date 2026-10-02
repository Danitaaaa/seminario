import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import { Persistencia } from '../../../persistencia/Persistencia';
import { CrearNodo } from '../crearNodo';
import { ModificarNodo } from '../modificarNodo';

// Test de ModificarNodo: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const crearNodo = new CrearNodo(persistencia);
  const modificarNodo = new ModificarNodo(persistencia);

  const carpeta = await crearNodo.ejecutar({ nombre: 'Test ModificarNodo', idPadre: 1 });

  try {
    console.log('--- Renombrar ---');
    console.log(await modificarNodo.ejecutar({ id: carpeta.id, nombre: 'Renombrada' }));

    console.log('--- Renombrar con el mismo nombre ---');
    console.log(await modificarNodo.ejecutar({ id: carpeta.id, nombre: 'Renombrada' }));

    console.log('--- ¿Actualiza ultima_fecha_modificacion? ---');
    const antes = carpeta.ultimaFechaModificacion;
    const despues = (await modificarNodo.ejecutar({ id: carpeta.id, nombre: 'Otra vez' })).ultimaFechaModificacion;
    console.log(+antes === +despues ? 'NO se actualiza la fecha de modificación' : 'Fecha actualizada OK');

    console.log('--- Id inexistente ---');
    try {
      const r = await modificarNodo.ejecutar({ id: 999999, nombre: 'Nada' });
      console.log('NO falló, devolvió:', r);
    } catch (e: any) {
      console.log('Error:', e.message);
    }

    console.log('--- Nombre vacío ---');
    try {
      console.log('NO falló:', await modificarNodo.ejecutar({ id: carpeta.id, nombre: '' }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Nombre de 256 caracteres ---');
    try {
      console.log('NO falló:', await modificarNodo.ejecutar({ id: carpeta.id, nombre: 'a'.repeat(256) }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }
  } finally {
    await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = $1', [carpeta.id]);
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
