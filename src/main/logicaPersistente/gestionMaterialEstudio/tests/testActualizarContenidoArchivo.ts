import fs from 'fs';
import os from 'os';
import path from 'path';
import { pool, verifyDbConnection } from '../../../persistencia/baseDeDatos';
import { Persistencia } from '../../../persistencia/persistencia';
import { Almacenamiento } from '../../../persistencia/almacenamiento';
import { CrearNodo } from '../crearNodo';
import { CrearArchivo } from '../crearArchivo';
import { ActualizarContenidoArchivo } from '../actualizarContenidoArchivo';

let fallos = 0;

// Verifica una condición e informa el resultado.
function verificar(titulo: string, condicion: boolean, detalle?: unknown) {
  console.log(`--- ${titulo} ---`);
  if (condicion) {
    console.log('OK');
  } else {
    fallos++;
    console.log('FALLO', detalle ?? '');
  }
}

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

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Test de ActualizarContenidoArchivo: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);

  // Carpetas temporales: una para el almacenamiento y otra para los archivos de origen
  const dirAlmacen = fs.mkdtempSync(path.join(os.tmpdir(), 'almacen-'));
  const dirOrigen = fs.mkdtempSync(path.join(os.tmpdir(), 'origen-'));
  const almacenamiento = new Almacenamiento(dirAlmacen);

  const crearNodo = new CrearNodo(persistencia);
  const crearArchivo = new CrearArchivo(persistencia, almacenamiento);
  const actualizar = new ActualizarContenidoArchivo(persistencia, almacenamiento);

  // Crea un archivo de origen con el contenido dado y devuelve su ruta.
  const crearOrigen = (nombre: string, contenido: string): string => {
    const ruta = path.join(dirOrigen, nombre);
    fs.writeFileSync(ruta, contenido);
    return ruta;
  };
  const leerFisico = (rutaFisica: string): string =>
    fs.readFileSync(almacenamiento.rutaCompleta(rutaFisica), 'utf8');

  const carpeta = await crearNodo.ejecutar({ nombre: 'Test ActualizarContenido', idPadre: 1 });

  try {
    const archivo = await crearArchivo.ejecutar({
      nombre: 'a',
      extension: 'txt',
      rutaFisica: crearOrigen('a.txt', 'hola'),
      idPadre: carpeta.id,
    });
    verificar('El archivo se creó con el tamaño real (4 bytes)', archivo.tamanio === 4, archivo.tamanio);

    // Caso normal
    await esperar(20);
    const nuevo = 'contenido nuevo y más largo';
    const actualizado = await actualizar.ejecutar(archivo.id, crearOrigen('b.txt', nuevo));
    verificar('El tamaño coincide con el del archivo nuevo', actualizado.tamanio === Buffer.byteLength(nuevo), actualizado.tamanio);
    verificar('El contenido físico fue reemplazado', leerFisico(archivo.rutaFisica) === nuevo);
    verificar('La ruta física no cambió', actualizado.rutaFisica === archivo.rutaFisica);
    verificar('La fecha de modificación se actualizó', +actualizado.ultimaFechaModificacion > +archivo.ultimaFechaModificacion);
    verificar(
      'No quedó ningún .tmp en el almacenamiento',
      !fs.readdirSync(dirAlmacen).some((f) => f.endsWith('.tmp')),
      fs.readdirSync(dirAlmacen)
    );

    // Archivo vacío
    const vacio = await actualizar.ejecutar(archivo.id, crearOrigen('vacio.txt', ''));
    verificar('Archivo vacío: tamaño 0', vacio.tamanio === 0, vacio.tamanio);

    // Casos de error
    await esperarError('Archivo de origen inexistente', () =>
      actualizar.ejecutar(archivo.id, path.join(dirOrigen, 'no-existe.txt')));
    verificar('El archivo original no se dañó', leerFisico(archivo.rutaFisica) === '');

    await esperarError('Id inexistente', () =>
      actualizar.ejecutar(999999, crearOrigen('c.txt', 'x')));
  } finally {
    await persistencia.ejecutar('DELETE FROM archivos WHERE id_padre = $1', [carpeta.id]);
    await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = $1', [carpeta.id]);
    fs.rmSync(dirAlmacen, { recursive: true, force: true });
    fs.rmSync(dirOrigen, { recursive: true, force: true });
    await pool.end();
  }

  console.log(fallos === 0 ? '\nTodos los casos OK' : `\n${fallos} caso(s) fallaron`);
  process.exitCode = fallos === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});