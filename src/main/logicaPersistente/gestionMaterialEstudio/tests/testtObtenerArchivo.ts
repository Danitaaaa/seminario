import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import { Persistencia } from '../../../persistencia/Persistencia';
import { CrearNodo } from '../crearNodo';
import { CrearArchivo } from '../CrearArchivo';
import { ObtenerArchivo } from '../ObtenerArchivo';

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Test de ObtenerArchivo: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const crearNodo = new CrearNodo(persistencia);
  const crearArchivo = new CrearArchivo(persistencia);
  const obtenerArchivo = new ObtenerArchivo(persistencia);

  const carpeta = await crearNodo.ejecutar({ nombre: 'Test ObtenerArchivo', idPadre: 1 });
  const archivo = await crearArchivo.ejecutar({ nombre: 'a', extension: 'pdf', rutaFisica: '/tmp/a.pdf', tamanio: 10, idPadre: carpeta.id });

  try {
    console.log('--- Obtener archivo ---');
    await esperar(50);
    const obtenido = await obtenerArchivo.ejecutar({ id: archivo.id });
    console.log(obtenido);

    console.log('--- ¿Actualiza la fecha de acceso y no la de modificación? ---');
    console.log(+obtenido.ultimaFechaAcceso > +archivo.ultimaFechaAcceso ? 'Fecha de acceso actualizada OK' : 'NO se actualizó la fecha de acceso');
    console.log(+obtenido.ultimaFechaModificacion === +archivo.ultimaFechaModificacion ? 'Fecha de modificación intacta OK' : 'Cambió la fecha de modificación');

    console.log('--- Id inexistente ---');
    try {
      console.log('NO falló:', await obtenerArchivo.ejecutar({ id: 999999 }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Id negativo ---');
    try {
      console.log('NO falló:', await obtenerArchivo.ejecutar({ id: -1 }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Id decimal (el DTO lo frena, la lógica no) ---');
    try {
      console.log('NO falló:', await obtenerArchivo.ejecutar({ id: 1.5 }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }
  } finally {
    await persistencia.ejecutar('DELETE FROM archivos WHERE id_padre = $1', [carpeta.id]);
    await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = $1', [carpeta.id]);
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
