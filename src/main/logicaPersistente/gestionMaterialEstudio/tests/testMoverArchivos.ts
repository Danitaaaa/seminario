import { pool, verifyDbConnection } from '../../../persistencia/baseDeDatos';
import { Persistencia } from '../../../persistencia/persistencia';
import { CrearNodo } from '../crearNodo';
import { CrearArchivo } from '../crearArchivo';
import { MoverArchivos } from '../moverArchivos';
import { EntornoArchivos, verificar, esperarError, terminar } from './entornoTest';

// Test de MoverArchivos: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const entorno = new EntornoArchivos();
  const crearNodo = new CrearNodo(persistencia);
  const crearArchivo = new CrearArchivo(persistencia, entorno.almacenamiento);
  const moverArchivos = new MoverArchivos(persistencia);

  const origen = await crearNodo.ejecutar({ nombre: 'Test MoverArchivos origen', idPadre: 1 });
  const destino = await crearNodo.ejecutar({ nombre: 'Test MoverArchivos destino', idPadre: 1 });

  // Devuelve la carpeta padre actual de un archivo.
  const padreDe = async (idArchivo: number): Promise<number> => {
    const [fila] = await persistencia.ejecutar(
      'SELECT id_padre FROM archivos WHERE id_archivo = $1',
      [idArchivo]
    );
    return fila.id_padre;
  };

  try {
    const nuevo = (nombre: string, idPadre: number) =>
      crearArchivo.ejecutar({ nombre, extension: 'pdf', rutaFisica: entorno.origen(10), idPadre });
    const a = await nuevo('a', origen.id);
    const b = await nuevo('b', origen.id);
    const c = await nuevo('c', origen.id);
    await nuevo('c', destino.id);

    // Casos normales
    const r1 = await moverArchivos.ejecutar({ ids: [a.id], idPadre: destino.id });
    verificar('Mover un archivo', r1.length === 1 && r1[0].idPadre === destino.id, r1);

    const r2 = await moverArchivos.ejecutar({ ids: [a.id, b.id], idPadre: origen.id });
    verificar('Mover varios archivos', r2.length === 2 && r2.every((x) => x.idPadre === origen.id), r2);

    const r3 = await moverArchivos.ejecutar({ ids: [a.id], idPadre: origen.id });
    verificar('Mover a la misma carpeta donde ya está', r3.length === 1 && r3[0].idPadre === origen.id, r3);

    // Conflicto de nombres
    await esperarError('Mover a una carpeta con un archivo del mismo nombre', () =>
      moverArchivos.ejecutar({ ids: [c.id], idPadre: destino.id }));

    await esperarError('Mover varios donde uno choca', () =>
      moverArchivos.ejecutar({ ids: [a.id, c.id], idPadre: destino.id }));
    verificar('"a" no se movió (todo o nada)', (await padreDe(a.id)) === origen.id);

    // Ids inválidos
    const vacio = await moverArchivos.ejecutar({ ids: [], idPadre: destino.id });
    verificar('Lista de ids vacía (el DTO la frena, la lógica devuelve [])', vacio.length === 0, vacio);

    await esperarError('Ids inexistentes', () =>
      moverArchivos.ejecutar({ ids: [999999], idPadre: destino.id }));

    await esperarError('Ids mezclados (uno válido y uno inexistente)', () =>
      moverArchivos.ejecutar({ ids: [a.id, 999999], idPadre: destino.id }));
    verificar('"a" no se movió (todo o nada)', (await padreDe(a.id)) === origen.id);

    const rep = await moverArchivos.ejecutar({ ids: [b.id, b.id], idPadre: destino.id });
    verificar('Ids repetidos (mueve una sola vez)', rep.length === 1 && rep[0].idPadre === destino.id, rep);

    // Destino inválido
    await esperarError('Carpeta destino inexistente', () =>
      moverArchivos.ejecutar({ ids: [a.id], idPadre: 999999 }));
    verificar('"a" no se movió', (await padreDe(a.id)) === origen.id);
  } finally {
    await persistencia.ejecutar('DELETE FROM archivos WHERE id_padre = ANY($1::int[])', [[origen.id, destino.id]]);
    await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = ANY($1::int[])', [[origen.id, destino.id]]);
    entorno.limpiar();
    await pool.end();
  }

  terminar();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});