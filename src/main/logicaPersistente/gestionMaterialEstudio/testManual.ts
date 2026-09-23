// src/main/logicaPersistente/gestionMaterialEstudio/_test-manual.ts
import { pool, verifyDbConnection } from '../../persistencia/BaseDeDatos';
import { Persistencia } from '../../persistencia/Persistencia';
import { CrearNodo } from './crearNodo';
import { BuscarNodos } from './buscarNodos';
import { ModificarNodo } from './modificarNodo';
import { MoverNodo } from './moverNodo';
import { EliminarNodo } from './elminarNodo';

async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);

  const crearNodo = new CrearNodo(persistencia);
  const buscarNodos = new BuscarNodos(persistencia);
  const modificarNodo = new ModificarNodo(persistencia);
  const moverNodo = new MoverNodo(persistencia);
  const eliminarNodo = new EliminarNodo(persistencia);

  console.log('--- Crear carpeta raíz ---');
  const raiz = await crearNodo.ejecutar({ nombre: 'Materias', idPadre: null });
  console.log(raiz);

  console.log('--- Crear subcarpeta ---');
  const hijo = await crearNodo.ejecutar({ nombre: 'Matemática', idPadre: raiz.id });
  console.log(hijo);

  console.log('--- Buscar "matema" (con typo) ---');
  console.log(await buscarNodos.ejecutar({ idPadre: raiz.id, busqueda: 'matema' }));

  console.log('--- Renombrar ---');
  console.log(await modificarNodo.ejecutar({ id: hijo.id, nombre: 'Matemática II' }));

  console.log('--- Mover a raíz (null) ---');
  console.log(await moverNodo.ejecutar({ id: hijo.id, idNuevoPadre: null }));

 console.log('--- Crear otro hijo que se queda adentro ---');
 const hijo2 = await crearNodo.ejecutar({ nombre: 'Física', idPadre: raiz.id });
 console.log(hijo2);

 console.log('--- Eliminar raíz con un hijo adentro (debería fallar) ---');
 try {
    await eliminarNodo.ejecutar({ id: raiz.id });
 } catch (e: any) {
    console.log('Error esperado:', e.message);
 }

  console.log('--- Eliminar nodo suelto ---');
  await eliminarNodo.ejecutar({ id: hijo.id });
  console.log('Eliminado OK');

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});