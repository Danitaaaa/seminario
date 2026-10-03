import { pool, verifyDbConnection } from '../../../persistencia/baseDeDatos';
import { Persistencia } from '../../../persistencia/persistencia';
import { CrearNodo } from '../crearNodo';
import { MoverNodo } from '../moverNodo';

let fallos = 0;

// Ejecuta fn y espera que lance un error.
async function esperarError(titulo: string, fn: () => Promise<unknown>) {
  console.log(`--- ${titulo} ---`);
  try {
    const r = await fn();
    fallos++;
    console.log('FALLO: no lanzó error, devolvió', r);
  } catch (e: any) {
    console.log('OK, error esperado:', e.message);
  }
}

async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const crearNodo = new CrearNodo(persistencia);
  const moverNodo = new MoverNodo(persistencia);

  const a = await crearNodo.ejecutar({ nombre: 'Test MoverNodo A', idPadre: 1 });
  const b = await crearNodo.ejecutar({ nombre: 'Test MoverNodo B', idPadre: 1 });
  const hijo = await crearNodo.ejecutar({ nombre: 'Hijo', idPadre: a.id });
  const ids = [hijo.id, a.id, b.id];

  try {
    // Caso normal
    console.log('--- Mover hijo de A a B ---');
    await moverNodo.ejecutar({ id: hijo.id, idNuevoPadre: b.id });
    const filas = await persistencia.ejecutar(
      'SELECT id_padre FROM nodos WHERE id_nodo = $1',
      [hijo.id]
    );
    if (filas[0].id_padre !== b.id) {
      fallos++;
      console.log('FALLO: el hijo no quedó dentro de B');
    } else {
      console.log('OK');
    }
    await moverNodo.ejecutar({ id: hijo.id, idNuevoPadre: a.id });

    // Casos de error
    await esperarError('Mover a null (dejaría una segunda raíz)', () =>
      moverNodo.ejecutar({ id: hijo.id, idNuevoPadre: null }));

    await esperarError('Mover un nodo dentro de sí mismo', () =>
      moverNodo.ejecutar({ id: a.id, idNuevoPadre: a.id }));

    await esperarError('Mover un nodo dentro de su propio hijo (ciclo)', () =>
      moverNodo.ejecutar({ id: a.id, idNuevoPadre: hijo.id }));

    await esperarError('Mover la carpeta raíz dentro de otra', () =>
      moverNodo.ejecutar({ id: 1, idNuevoPadre: b.id }));

    await esperarError('Mover a un padre inexistente', () =>
      moverNodo.ejecutar({ id: hijo.id, idNuevoPadre: 999999 }));

    await esperarError('Mover un nodo inexistente', () =>
      moverNodo.ejecutar({ id: 999999, idNuevoPadre: a.id }));
  } finally {
    // Limpieza: desenganchar los nodos de prueba antes de borrarlos
    await persistencia.ejecutar(
      'UPDATE nodos SET id_padre = NULL WHERE id_nodo = ANY($1::int[])',
      [ids]
    );
    await persistencia.ejecutar(
      'DELETE FROM nodos WHERE id_nodo = ANY($1::int[])',
      [ids]
    );
    await pool.end();
  }

  console.log(fallos === 0 ? '\nTodos los casos OK' : `\n${fallos} caso(s) fallaron`);
  process.exitCode = fallos === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});