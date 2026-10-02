import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import { Persistencia } from '../../../persistencia/Persistencia';
import { CrearNodo } from '../crearNodo';
import { CrearArchivo } from '../CrearArchivo';
import { EliminarNodo } from '../elminarNodo';

// Test de EliminarNodo: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const crearNodo = new CrearNodo(persistencia);
  const crearArchivo = new CrearArchivo(persistencia);
  const eliminarNodo = new EliminarNodo(persistencia);

  const conHijo = await crearNodo.ejecutar({ nombre: 'Test EliminarNodo con hijo', idPadre: 1 });
  const hijo = await crearNodo.ejecutar({ nombre: 'Hijo', idPadre: conHijo.id });
  const conArchivo = await crearNodo.ejecutar({ nombre: 'Test EliminarNodo con archivo', idPadre: 1 });
  await crearArchivo.ejecutar({ nombre: 'apunte', extension: 'txt', rutaFisica: '/tmp/no-existe.txt', tamanio: 0, idPadre: conArchivo.id });

  try {
    console.log('--- Eliminar carpeta vacía ---');
    const vacia = await crearNodo.ejecutar({ nombre: 'Vacía', idPadre: 1 });
    await eliminarNodo.ejecutar({ id: vacia.id });
    console.log('Eliminado OK');

    console.log('--- Eliminar carpeta con subcarpeta (debería fallar) ---');
    try {
      await eliminarNodo.ejecutar({ id: conHijo.id });
      console.log('NO falló: se borró una carpeta con contenido');
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Eliminar carpeta con un archivo (debería fallar) ---');
    try {
      await eliminarNodo.ejecutar({ id: conArchivo.id });
      console.log('NO falló: se borró una carpeta con archivos');
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Eliminar la raíz (id 1) ---');
    try {
      await eliminarNodo.ejecutar({ id: 1 });
      console.log('NO falló: se borró la raíz');
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Eliminar id inexistente ---');
    try {
      await eliminarNodo.ejecutar({ id: 999999 });
      console.log('NO falló');
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Eliminar dos veces el mismo nodo ---');
    await eliminarNodo.ejecutar({ id: hijo.id });
    try {
      await eliminarNodo.ejecutar({ id: hijo.id });
      console.log('NO falló');
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }
  } finally {
    await persistencia.ejecutar('DELETE FROM archivos WHERE id_padre = $1', [conArchivo.id]);
    for (const id of [hijo.id, conHijo.id, conArchivo.id]) {
      await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = $1', [id]);
    }
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
