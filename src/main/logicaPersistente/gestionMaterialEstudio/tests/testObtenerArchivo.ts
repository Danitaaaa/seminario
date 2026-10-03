import { pool, verifyDbConnection } from '../../../persistencia/baseDeDatos';
import { Persistencia } from '../../../persistencia/persistencia';
import { CrearNodo } from '../crearNodo';
import { CrearArchivo } from '../crearArchivo';
import { ObtenerArchivo } from '../obtenerArchivo';
import { EntornoArchivos, verificar, esperarError, terminar } from './entornoTest';

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Test de ObtenerArchivo: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const entorno = new EntornoArchivos();
  const crearNodo = new CrearNodo(persistencia);
  const crearArchivo = new CrearArchivo(persistencia, entorno.almacenamiento);
  const obtenerArchivo = new ObtenerArchivo(persistencia);

  const carpeta = await crearNodo.ejecutar({ nombre: 'Test ObtenerArchivo', idPadre: 1 });

  try {
    const archivo = await crearArchivo.ejecutar({
      nombre: 'a', extension: 'pdf', rutaFisica: entorno.origen(10), idPadre: carpeta.id,
    });

    await esperar(50);
    const obtenido = await obtenerArchivo.ejecutar({ id: archivo.id });
    verificar('Devuelve el archivo pedido', obtenido.id === archivo.id && obtenido.nombre === 'a', obtenido);
    verificar('Actualiza la fecha de acceso', +obtenido.ultimaFechaAcceso > +archivo.ultimaFechaAcceso);
    verificar('No cambia la fecha de modificación', +obtenido.ultimaFechaModificacion === +archivo.ultimaFechaModificacion);
    verificar('Devuelve la ruta física para abrir el archivo', obtenido.rutaFisica === archivo.rutaFisica);

    await esperarError('Id inexistente', () => obtenerArchivo.ejecutar({ id: 999999 }));
    await esperarError('Id negativo', () => obtenerArchivo.ejecutar({ id: -1 }));
    await esperarError('Id decimal (el DTO lo frena, la lógica no)', () => obtenerArchivo.ejecutar({ id: 1.5 }));
  } finally {
    await persistencia.ejecutar('DELETE FROM archivos WHERE id_padre = $1', [carpeta.id]);
    await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = $1', [carpeta.id]);
    entorno.limpiar();
    await pool.end();
  }

  terminar();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});