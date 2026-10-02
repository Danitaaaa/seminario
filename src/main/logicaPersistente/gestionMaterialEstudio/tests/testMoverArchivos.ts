import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import { Persistencia } from '../../../persistencia/Persistencia';
import { CrearNodo } from '../crearNodo';
import { CrearArchivo } from '../CrearArchivo';
import { MoverArchivos } from '../MoverArchivos';

// Test de MoverArchivos: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const crearNodo = new CrearNodo(persistencia);
  const crearArchivo = new CrearArchivo(persistencia);
  const moverArchivos = new MoverArchivos(persistencia);

  const origen = await crearNodo.ejecutar({ nombre: 'Test MoverArchivos origen', idPadre: 1 });
  const destino = await crearNodo.ejecutar({ nombre: 'Test MoverArchivos destino', idPadre: 1 });
  const base = { extension: 'pdf', rutaFisica: '/tmp/x.pdf', tamanio: 10, idPadre: origen.id };
  const a = await crearArchivo.ejecutar({ ...base, nombre: 'a' });
  const b = await crearArchivo.ejecutar({ ...base, nombre: 'b' });
  const c = await crearArchivo.ejecutar({ ...base, nombre: 'c' });
  await crearArchivo.ejecutar({ ...base, nombre: 'c', idPadre: destino.id });

  try {
    console.log('--- Mover un archivo ---');
    console.log(await moverArchivos.ejecutar({ ids: [a.id], idPadre: destino.id }));

    console.log('--- Mover varios archivos ---');
    console.log((await moverArchivos.ejecutar({ ids: [a.id, b.id], idPadre: origen.id })).map((x) => x.nombre));

    console.log('--- Mover a la misma carpeta donde ya está ---');
    console.log((await moverArchivos.ejecutar({ ids: [a.id], idPadre: origen.id })).map((x) => x.idPadre));

    console.log('--- Mover a una carpeta con un archivo del mismo nombre (debería fallar) ---');
    try {
      console.log('NO falló:', await moverArchivos.ejecutar({ ids: [c.id], idPadre: destino.id }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Mover varios donde uno choca: ¿se mueve alguno? ---');
    try {
      await moverArchivos.ejecutar({ ids: [a.id, c.id], idPadre: destino.id });
      console.log('NO falló');
    } catch (e: any) {
      const [fila] = await persistencia.ejecutar('SELECT id_padre FROM archivos WHERE id_archivo = $1', [a.id]);
      console.log('Error esperado:', e.message, '| "a" quedó en', fila.id_padre === origen.id ? 'origen (OK, todo o nada)' : 'destino');
    }

    console.log('--- Lista de ids vacía (el DTO lo frena, la lógica no) ---');
    console.log(await moverArchivos.ejecutar({ ids: [], idPadre: destino.id }));

    console.log('--- Ids inexistentes (no avisa, devuelve vacío) ---');
    console.log(await moverArchivos.ejecutar({ ids: [999999], idPadre: destino.id }));

    console.log('--- Ids repetidos ---');
    console.log((await moverArchivos.ejecutar({ ids: [b.id, b.id], idPadre: destino.id })).length);

    console.log('--- Carpeta destino inexistente ---');
    try {
      console.log('NO falló:', await moverArchivos.ejecutar({ ids: [a.id], idPadre: 999999 }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }
  } finally {
    await persistencia.ejecutar('DELETE FROM archivos WHERE id_padre = ANY($1::int[])', [[origen.id, destino.id]]);
    await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = ANY($1::int[])', [[origen.id, destino.id]]);
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
