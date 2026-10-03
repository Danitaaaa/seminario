import fs from 'node:fs';
import path from 'node:path';
import { pool, verifyDbConnection } from '../../../persistencia/baseDeDatos';
import { Persistencia } from '../../../persistencia/persistencia';
import { CrearNodo } from '../crearNodo';
import { CrearArchivo } from '../crearArchivo';
import { EliminarArchivo } from '../eliminarArchivo';
import { EntornoArchivos, verificar, esperarError, terminar } from './entornoTest';

// Test de EliminarArchivo: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const entorno = new EntornoArchivos();
  const crearNodo = new CrearNodo(persistencia);
  const crearArchivo = new CrearArchivo(persistencia, entorno.almacenamiento);
  const eliminarArchivo = new EliminarArchivo(persistencia, entorno.almacenamiento);

  const carpeta = await crearNodo.ejecutar({ nombre: 'Test EliminarArchivo', idPadre: 1 });

  const existeFila = async (id: number): Promise<boolean> =>
    (await persistencia.ejecutar('SELECT 1 FROM archivos WHERE id_archivo = $1', [id])).length > 0;

  try {
    // Caso normal
    const real = await crearArchivo.ejecutar({
      nombre: 'real', extension: 'txt', rutaFisica: entorno.origen('hola'), idPadre: carpeta.id,
    });
    const fisicoReal = entorno.fisico(real.rutaFisica);
    verificar('El archivo físico existe antes de eliminar', fs.existsSync(fisicoReal));

    await eliminarArchivo.ejecutar({ id: real.id });
    verificar(
      'Registro y archivo físico eliminados',
      !fs.existsSync(fisicoReal) && !(await existeFila(real.id))
    );

    // El archivo físico ya no está (borrado a mano)
    const fantasma = await crearArchivo.ejecutar({
      nombre: 'fantasma', extension: 'txt', rutaFisica: entorno.origen('x'), idPadre: carpeta.id,
    });
    fs.rmSync(entorno.fisico(fantasma.rutaFisica));
    let lanzo = false;
    try {
      await eliminarArchivo.ejecutar({ id: fantasma.id });
    } catch {
      lanzo = true;
    }
    verificar('Archivo físico faltante: no lanza error y borra el registro', !lanzo && !(await existeFila(fantasma.id)));

    // Ruta maliciosa en la base (../): no debe borrar nada fuera del almacenamiento
    const protegido = path.join(entorno.dirOrigen, 'protegido.txt');
    fs.writeFileSync(protegido, 'no me borres');
    const rutaMala = path.join('..', path.basename(entorno.dirOrigen), 'protegido.txt');
    const [fila] = await persistencia.ejecutar(
      `INSERT INTO archivos (nombre, extension, ruta_fisica, tamaño, id_padre)
       VALUES ('malicioso', 'txt', $1, 0, $2) RETURNING id_archivo`,
      [rutaMala, carpeta.id]
    );
    await eliminarArchivo.ejecutar({ id: fila.id_archivo }); // se loguea "Ruta de archivo inválida"
    verificar('Ruta con ../: no borra archivos fuera del almacenamiento', fs.existsSync(protegido));
    verificar('Ruta con ../: el registro sí se elimina', !(await existeFila(fila.id_archivo)));

    // Errores
    await esperarError('Id inexistente', () => eliminarArchivo.ejecutar({ id: 999999 }));
    await esperarError('Eliminar dos veces el mismo archivo', () => eliminarArchivo.ejecutar({ id: real.id }));
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