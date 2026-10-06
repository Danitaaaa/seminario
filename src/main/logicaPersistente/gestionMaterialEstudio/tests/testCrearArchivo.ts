import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import { Persistencia } from '../../../persistencia/Persistencia';
import { CrearNodo } from '../crearNodo';
import { CrearArchivo } from '../CrearArchivo';

// Test de CrearArchivo: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const crearNodo = new CrearNodo(persistencia);
  const crearArchivo = new CrearArchivo(persistencia);

  const carpeta = await crearNodo.ejecutar({ nombre: 'Test CrearArchivo', idPadre: 1 });
  const base = { extension: 'pdf', rutaFisica: '/tmp/apunte.pdf', tamanio: 1024, idPadre: carpeta.id };

  try {
    console.log('--- Crear archivo ---');
    console.log(await crearArchivo.ejecutar({ ...base, nombre: 'apunte' }));

    console.log('--- Mismo nombre, otra extensión ---');
    console.log(await crearArchivo.ejecutar({ ...base, nombre: 'apunte', extension: 'docx' }));

    console.log('--- Mismo nombre y extensión en la misma carpeta (debería fallar) ---');
    try {
      console.log('NO falló:', await crearArchivo.ejecutar({ ...base, nombre: 'apunte' }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Archivo vacío (tamaño 0) ---');
    console.log(await crearArchivo.ejecutar({ ...base, nombre: 'vacio', tamanio: 0 }));

    console.log('--- Tamaño negativo (el DTO lo frena, la lógica no) ---');
    try {
      console.log('NO falló: se guardó tamaño negativo', await crearArchivo.ejecutar({ ...base, nombre: 'negativo', tamanio: -10 }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Tamaño máximo seguro de JS (2^53 - 1) ---');
    const grande = await crearArchivo.ejecutar({ ...base, nombre: 'grande', tamanio: Number.MAX_SAFE_INTEGER });
    console.log(grande.tamanio === Number.MAX_SAFE_INTEGER ? 'OK' : `Distinto: ${grande.tamanio}`);

    console.log('--- Tamaño decimal ---');
    try {
      console.log('NO falló:', await crearArchivo.ejecutar({ ...base, nombre: 'decimal', tamanio: 10.5 }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Nombre vacío ---');
    try {
      console.log('NO falló: permite nombre vacío', await crearArchivo.ejecutar({ ...base, nombre: '' }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Extensión de 21 caracteres ---');
    try {
      console.log('NO falló:', await crearArchivo.ejecutar({ ...base, nombre: 'ext', extension: 'x'.repeat(21) }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Ruta física vacía ---');
    try {
      console.log('NO falló: permite ruta vacía', await crearArchivo.ejecutar({ ...base, nombre: 'sinruta', rutaFisica: '' }));
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Carpeta padre inexistente ---');
    try {
      console.log('NO falló:', await crearArchivo.ejecutar({ ...base, nombre: 'huerfano', idPadre: 999999 }));
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
