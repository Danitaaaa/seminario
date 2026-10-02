import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import { Persistencia } from '../../../persistencia/Persistencia';
import { CrearNodo } from '../crearNodo';
import { MoverNodo } from '../moverNodo';

// Test de MoverNodo: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const crearNodo = new CrearNodo(persistencia);
  const moverNodo = new MoverNodo(persistencia);

  const a = await crearNodo.ejecutar({ nombre: 'Test MoverNodo A', idPadre: 1 });
  const b = await crearNodo.ejecutar({ nombre: 'Test MoverNodo B', idPadre: 1 });
  const hijo = await crearNodo.ejecutar({ nombre: 'Hijo', idPadre: a.id });

  try {
    console.log('--- Mover hijo de A a B ---');
    console.log(await moverNodo.ejecutar({ id: hijo.id, idNuevoPadre: b.id }));

    console.log('--- Mover a null (raíz suelta) ---');
    console.log(await moverNodo.ejecutar({ id: hijo.id, idNuevoPadre: null }));
    await moverNodo.ejecutar({ id: hijo.id, idNuevoPadre: a.id });

    console.log('--- Mover un nodo dentro de sí mismo ---');
    try {
      const r = await moverNodo.ejecutar({ id: a.id, idNuevoPadre: a.id });
      console.log('NO falló: el nodo quedó como padre de sí mismo', r);
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }
    await moverNodo.ejecutar({ id: a.id, idNuevoPadre: 1 });

    console.log('--- Mover un nodo dentro de su propio hijo (ciclo) ---');
    try {
      const r = await moverNodo.ejecutar({ id: a.id, idNuevoPadre: hijo.id });
      console.log('NO falló: se creó un ciclo A -> Hijo -> A', r);
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }
    await moverNodo.ejecutar({ id: a.id, idNuevoPadre: 1 });

    console.log('--- Mover la carpeta raíz (id 1) ---');
    try {
      const r = await moverNodo.ejecutar({ id: 1, idNuevoPadre: b.id });
      console.log('NO falló: la raíz quedó dentro de otra carpeta', r);
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }
    await moverNodo.ejecutar({ id: 1, idNuevoPadre: null });

    console.log('--- Mover a un padre inexistente ---');
    try {
      console.log('NO falló:', await moverNodo.ejecutar({ id: hijo.id, idNuevoPadre: 999999 }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Mover un nodo inexistente ---');
    try {
      const r = await moverNodo.ejecutar({ id: 999999, idNuevoPadre: a.id });
      console.log('NO falló, devolvió:', r);
    } catch (e: any) {
      console.log('Error:', e.message);
    }
  } finally {
    await persistencia.ejecutar('UPDATE nodos SET id_padre = NULL WHERE id_nodo = 1');
    await persistencia.ejecutar('UPDATE nodos SET id_padre = 1 WHERE id_nodo = ANY($1::int[])', [[a.id, b.id]]);
    for (const id of [hijo.id, a.id, b.id]) {
      await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = $1', [id]);
    }
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
