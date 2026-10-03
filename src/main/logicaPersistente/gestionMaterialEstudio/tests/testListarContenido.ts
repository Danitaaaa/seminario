import { pool, verifyDbConnection } from '../../../persistencia/baseDeDatos';
import { Persistencia } from '../../../persistencia/persistencia';
import { CrearNodo } from '../crearNodo';
import { CrearArchivo } from '../crearArchivo';
import { BuscarNodos } from '../buscarNodos';
import { BuscarArchivos } from '../buscarArchivos';
import { ListarContenido } from '../listarContenido';
import { ElementoContenido } from '../entidades';
import { EntornoArchivos } from './entornoTest';

// Test de ListarContenido: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const entorno = new EntornoArchivos();
  const crearNodo = new CrearNodo(persistencia);
  const crearArchivo = new CrearArchivo(persistencia, entorno.almacenamiento);
  const listar = new ListarContenido(new BuscarNodos(persistencia), new BuscarArchivos(persistencia));

  const raiz = await crearNodo.ejecutar({ nombre: 'Test ListarContenido', idPadre: 1 });
  const zeta = await crearNodo.ejecutar({ nombre: 'Zeta', idPadre: raiz.id });
  const alfa = await crearNodo.ejecutar({ nombre: 'alfa', idPadre: raiz.id });

  try {
    const base = { idPadre: raiz.id };
    await crearArchivo.ejecutar({ ...base, nombre: 'beta', extension: 'pdf', rutaFisica: entorno.origen(500) });
    await crearArchivo.ejecutar({ ...base, nombre: 'Álgebra', extension: 'docx', rutaFisica: entorno.origen(5) });
    const grande = await crearArchivo.ejecutar({ ...base, nombre: 'Algebra', extension: 'pdf', rutaFisica: entorno.origen(9) });
    // Fuerza un tamaño > 2^32 sin crear un archivo real de 9 GB
    await persistencia.ejecutar('UPDATE archivos SET tamaño = $1 WHERE id_archivo = $2', [9_000_000_000, grande.id]);

    const ver = (e: ElementoContenido[]) => e.map((x) => `${x.tipo === 'carpeta' ? '[C]' : '[A]'} ${x.nombre}${x.extension ? '.' + x.extension : ''} (${x.tamaño})`);
    const criterios = { idPadre: raiz.id, ordenarPor: 'nombre' as const, direccion: 'ASC' as const };

    console.log('--- Listar todo por nombre ASC (carpetas y archivos mezclados, sin distinguir mayúsculas) ---');
    console.log(ver(await listar.ejecutar(criterios)));

    console.log('--- Por nombre DESC ---');
    console.log(ver(await listar.ejecutar({ ...criterios, direccion: 'DESC' })));

    console.log('--- Por tipo ASC (carpetas primero, luego por extensión) ---');
    console.log(ver(await listar.ejecutar({ ...criterios, ordenarPor: 'tipo' })));

    console.log('--- Por tipo DESC (archivos primero) ---');
    console.log(ver(await listar.ejecutar({ ...criterios, ordenarPor: 'tipo', direccion: 'DESC' })));

    console.log('--- Por tamaño ASC (incluye un tamaño > 2^32) ---');
    console.log(ver(await listar.ejecutar({ ...criterios, ordenarPor: 'tamaño' })));

    console.log('--- Por fecha de carga DESC ---');
    console.log(ver(await listar.ejecutar({ ...criterios, ordenarPor: 'fecha_carga', direccion: 'DESC' })));

    console.log('--- Solo carpetas ---');
    console.log(ver(await listar.ejecutar({ ...criterios, tipo: 'carpeta' })));

    console.log('--- Solo archivos ---');
    console.log(ver(await listar.ejecutar({ ...criterios, tipo: 'archivo' })));

    console.log('--- Búsqueda "algebra" (orden por relevancia) ---');
    console.log(ver(await listar.ejecutar({ ...criterios, busqueda: 'algebra' })));

    console.log('--- Búsqueda + orden por tipo ---');
    console.log(ver(await listar.ejecutar({ ...criterios, busqueda: 'a', ordenarPor: 'tipo' })));

    console.log('--- Búsqueda que no matchea nada ---');
    console.log(ver(await listar.ejecutar({ ...criterios, busqueda: 'qqqqqq' })));

    console.log('--- Carpeta vacía ---');
    console.log(ver(await listar.ejecutar({ ...criterios, idPadre: alfa.id })));

    console.log('--- idPadre inexistente ---');
    console.log(ver(await listar.ejecutar({ ...criterios, idPadre: 999999 })));

    console.log('--- ordenarPor inválido (sin pasar por el DTO) ---');
    try {
      console.log('NO falló:', ver(await listar.ejecutar({ ...criterios, ordenarPor: 'cualquiera' as any })));
    } catch (e: any) {
      console.log('Error:', e.message);
    }

    console.log('--- tipo inválido (sin pasar por el DTO, trae todo) ---');
    console.log(ver(await listar.ejecutar({ ...criterios, tipo: 'otro' as any })));
  } finally {
    await persistencia.ejecutar('DELETE FROM archivos WHERE id_padre = $1', [raiz.id]);
    await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = ANY($1::int[])', [[zeta.id, alfa.id]]);
    await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = $1', [raiz.id]);
    entorno.limpiar();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});