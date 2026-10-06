import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import { Persistencia } from '../../../persistencia/Persistencia';
import { CrearNodo } from '../crearNodo';
import { CrearArchivo } from '../CrearArchivo';
import { BuscarArchivos } from '../buscarArchivos';

// Test de BuscarArchivos: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const crearNodo = new CrearNodo(persistencia);
  const crearArchivo = new CrearArchivo(persistencia);
  const buscarArchivos = new BuscarArchivos(persistencia);

  const raiz = await crearNodo.ejecutar({ nombre: 'Test BuscarArchivos', idPadre: 1 });
  const sub = await crearNodo.ejecutar({ nombre: 'Sub', idPadre: raiz.id });
  const base = { extension: 'pdf', rutaFisica: '/tmp/x.pdf', idPadre: raiz.id };
  await crearArchivo.ejecutar({ ...base, nombre: 'Resumen Álgebra', tamanio: 300 });
  await crearArchivo.ejecutar({ ...base, nombre: 'Parcial 1', tamanio: 100 });
  await crearArchivo.ejecutar({ ...base, nombre: '100% resuelto', tamanio: 200 });
  await crearArchivo.ejecutar({ ...base, nombre: 'Resumen Análisis', tamanio: 50, idPadre: sub.id });
  const nombres = (a: { nombre: string }[]) => a.map((x) => x.nombre);

  try {
    console.log('--- Listar archivos de la carpeta sin búsqueda (no incluye subcarpetas) ---');
    console.log(nombres(await buscarArchivos.ejecutar({ idPadre: raiz.id, ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Ordenar por tamaño DESC ---');
    console.log(nombres(await buscarArchivos.ejecutar({ idPadre: raiz.id, ordenarPor: 'tamaño', direccion: 'DESC' })));

    console.log('--- Buscar "resumen" (debe incluir el de la subcarpeta) ---');
    console.log(nombres(await buscarArchivos.ejecutar({ idPadre: raiz.id, busqueda: 'resumen', ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Buscar "algebra" sin tilde ---');
    console.log(nombres(await buscarArchivos.ejecutar({ idPadre: raiz.id, busqueda: 'algebra', ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Buscar con typo "parcail" ---');
    console.log(nombres(await buscarArchivos.ejecutar({ idPadre: raiz.id, busqueda: 'parcail', ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Buscar "%" (comodín de ILIKE, debería traer solo "100% resuelto") ---');
    console.log(nombres(await buscarArchivos.ejecutar({ idPadre: raiz.id, busqueda: '%', ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Buscar por extensión "pdf" (no busca en la extensión) ---');
    console.log(nombres(await buscarArchivos.ejecutar({ idPadre: raiz.id, busqueda: 'pdf', ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Intento de inyección SQL en la búsqueda ---');
    console.log(nombres(await buscarArchivos.ejecutar({ idPadre: raiz.id, busqueda: "'; DROP TABLE archivos; --", ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- Umbral 1 (solo coincidencias por ILIKE) ---');
    console.log(nombres(await buscarArchivos.ejecutar({ idPadre: raiz.id, busqueda: 'parcail', umbral: 1, ordenarPor: 'nombre', direccion: 'ASC' })));

    console.log('--- ordenarPor inválido (sin pasar por el DTO) ---');
    try {
      console.log('NO falló:', nombres(await buscarArchivos.ejecutar({ idPadre: raiz.id, ordenarPor: 'tipo' as any, direccion: 'ASC' })));
    } catch (e: any) {
      console.log('Error:', e.message);
    }

    console.log('--- idPadre inexistente ---');
    console.log(await buscarArchivos.ejecutar({ idPadre: 999999, busqueda: 'resumen', ordenarPor: 'nombre', direccion: 'ASC' }));
  } finally {
    await persistencia.ejecutar('DELETE FROM archivos WHERE id_padre = ANY($1::int[])', [[raiz.id, sub.id]]);
    await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = ANY($1::int[])', [[sub.id]]);
    await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = $1', [raiz.id]);
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
