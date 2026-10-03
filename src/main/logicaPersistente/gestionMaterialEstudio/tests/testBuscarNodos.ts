import { pool, verifyDbConnection } from '../../../persistencia/baseDeDatos';
import { Persistencia } from '../../../persistencia/persistencia';
import { CrearNodo } from '../crearNodo';
import { BuscarNodos } from '../buscarNodos';

// Test de BuscarNodos: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const crearNodo = new CrearNodo(persistencia);
  const buscarNodos = new BuscarNodos(persistencia);

  const raiz = await crearNodo.ejecutar({ nombre: 'Test BuscarNodos', idPadre: 1 });
  const mate = await crearNodo.ejecutar({ nombre: 'Matemática', idPadre: raiz.id });
  const fisica = await crearNodo.ejecutar({ nombre: 'Física', idPadre: raiz.id });
  const nieto = await crearNodo.ejecutar({ nombre: 'Matemática Discreta', idPadre: mate.id });
  const porcentaje = await crearNodo.ejecutar({ nombre: '100% aprobado', idPadre: raiz.id });
  const nombres = (n: { nombre: string }[]) => n.map((x) => x.nombre);

  try {
    console.log('--- Listar hijos directos sin búsqueda ---');
    console.log(nombres(await buscarNodos.ejecutar({ idPadre: raiz.id, ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Orden DESC ---');
    console.log(nombres(await buscarNodos.ejecutar({ idPadre: raiz.id, ordenarPor: 'nombre', direccion: 'DESC' })));

    console.log('--- Buscar "matema" (typo, debe incluir nieto) ---');
    console.log(nombres(await buscarNodos.ejecutar({ idPadre: raiz.id, busqueda: 'matema', ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Buscar en mayúsculas "FÍSICA" ---');
    console.log(nombres(await buscarNodos.ejecutar({ idPadre: raiz.id, busqueda: 'FÍSICA', ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Buscar sin tilde "fisica" ---');
    console.log(nombres(await buscarNodos.ejecutar({ idPadre: raiz.id, busqueda: 'fisica', ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Buscar "%" (comodín de ILIKE, debería traer solo "100% aprobado") ---');
    console.log(nombres(await buscarNodos.ejecutar({ idPadre: raiz.id, busqueda: '%', ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Buscar "_" (comodín de ILIKE, no hay ningún nombre con "_") ---');
    console.log(nombres(await buscarNodos.ejecutar({ idPadre: raiz.id, busqueda: '_', ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Búsqueda vacía "" (se comporta como sin búsqueda) ---');
    console.log(nombres(await buscarNodos.ejecutar({ idPadre: raiz.id, busqueda: '', ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Búsqueda con idPadre null ---');
    console.log(nombres(await buscarNodos.ejecutar({ idPadre: null, busqueda: 'matema', ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Umbral 0 (todo lo que tenga algo de similitud) ---');
    console.log(nombres(await buscarNodos.ejecutar({ idPadre: raiz.id, busqueda: 'xyz', umbral: 0, ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Intento de inyección SQL en la búsqueda ---');
    console.log(nombres(await buscarNodos.ejecutar({ idPadre: raiz.id, busqueda: "'; DROP TABLE nodos; --", ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Inyección en direccion (se ignora, cae en ASC) ---');
    console.log(nombres(await buscarNodos.ejecutar({ idPadre: raiz.id, ordenarPor: 'nombre', direccion: 'ASC; DROP TABLE nodos' as any })));

    console.log('--- ordenarPor inválido (sin pasar por el DTO) ---');
    try {
      console.log('NO falló:', nombres(await buscarNodos.ejecutar({ idPadre: raiz.id, ordenarPor: 'cualquiera' as any, direccion: 'ASC' })));
    } catch (e: any) {
      console.log('Error:', e.message);
    }

    console.log('--- idPadre inexistente ---');
    console.log(await buscarNodos.ejecutar({ idPadre: 999999, ordenarPor: 'nombre', direccion: 'ASC' }));
  } finally {
    for (const id of [nieto.id, mate.id, fisica.id, porcentaje.id, raiz.id]) {
      await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = $1', [id]);
    }
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
