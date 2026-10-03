import fs from 'node:fs';
import { pool, verifyDbConnection } from '../../../persistencia/baseDeDatos';
import { Persistencia } from '../../../persistencia/persistencia';
import { CrearNodo } from '../crearNodo';
import { CrearArchivo } from '../crearArchivo';
import { EntornoArchivos, verificar, esperarError, terminar } from './entornoTest';

// Test de CrearArchivo: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const entorno = new EntornoArchivos();
  const crearNodo = new CrearNodo(persistencia);
  const crearArchivo = new CrearArchivo(persistencia, entorno.almacenamiento);

  const carpeta = await crearNodo.ejecutar({ nombre: 'Test CrearArchivo', idPadre: 1 });
  const cantidadFisicos = () => fs.readdirSync(entorno.dirAlmacen).length;

  try {
    const base = { extension: 'pdf', idPadre: carpeta.id };

    // Casos normales
    const a = await crearArchivo.ejecutar({ ...base, nombre: 'apunte', rutaFisica: entorno.origen('hola') });
    verificar('Crear archivo: tamaño real (4 bytes)', a.tamanio === 4, a.tamanio);
    verificar('El archivo físico existe', fs.existsSync(entorno.fisico(a.rutaFisica)));
    verificar('La ruta física es un nombre único con la extensión', /^[0-9a-f-]{36}\.pdf$/.test(a.rutaFisica), a.rutaFisica);

    const otraExt = await crearArchivo.ejecutar({ ...base, nombre: 'apunte', extension: 'docx', rutaFisica: entorno.origen('x') });
    verificar('Mismo nombre, otra extensión: se crea sin número', otraExt.nombre === 'apunte', otraExt.nombre);

    const vacio = await crearArchivo.ejecutar({ ...base, nombre: 'vacio', rutaFisica: entorno.origen('') });
    verificar('Archivo vacío: tamaño 0', vacio.tamanio === 0, vacio.tamanio);

    // Nombre duplicado: se numera
    const dup1 = await crearArchivo.ejecutar({ ...base, nombre: 'apunte', rutaFisica: entorno.origen('b') });
    const dup2 = await crearArchivo.ejecutar({ ...base, nombre: 'apunte', rutaFisica: entorno.origen('c') });
    verificar('Duplicado: "apunte (1)"', dup1.nombre === 'apunte (1)', dup1.nombre);
    verificar('Duplicado: "apunte (2)"', dup2.nombre === 'apunte (2)', dup2.nombre);
    verificar('Cada duplicado tiene su propio archivo físico', new Set([a.rutaFisica, dup1.rutaFisica, dup2.rutaFisica]).size === 3);

    // Errores: ninguno debe dejar archivos huérfanos
    const antes = cantidadFisicos();

    await esperarError('Nombre vacío', () =>
      crearArchivo.ejecutar({ ...base, nombre: '  ', rutaFisica: entorno.origen('x') }));

    await esperarError('Ruta de origen vacía', () =>
      crearArchivo.ejecutar({ ...base, nombre: 'sinruta', rutaFisica: '' }));

    await esperarError('Archivo de origen inexistente', () =>
      crearArchivo.ejecutar({ ...base, nombre: 'fantasma', rutaFisica: '/tmp/no-existe-123.pdf' }));

    await esperarError('Extensión de 21 caracteres', () =>
      crearArchivo.ejecutar({ ...base, nombre: 'ext', extension: 'x'.repeat(21), rutaFisica: entorno.origen('x') }));

    await esperarError('Carpeta padre inexistente', () =>
      crearArchivo.ejecutar({ ...base, nombre: 'huerfano', idPadre: 999999, rutaFisica: entorno.origen('x') }));

    verificar('Los errores no dejaron archivos huérfanos en el almacenamiento', cantidadFisicos() === antes, {
      antes,
      ahora: cantidadFisicos(),
    });
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