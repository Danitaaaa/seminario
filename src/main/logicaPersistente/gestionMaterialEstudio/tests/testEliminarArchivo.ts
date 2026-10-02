import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pool, verifyDbConnection } from '../../../persistencia/BaseDeDatos';
import { Persistencia } from '../../../persistencia/Persistencia';
import { CrearNodo } from '../crearNodo';
import { CrearArchivo } from '../CrearArchivo';
import { EliminarArchivo } from '../EliminarArchivo';

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Test de EliminarArchivo: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const crearNodo = new CrearNodo(persistencia);
  const crearArchivo = new CrearArchivo(persistencia);
  const eliminarArchivo = new EliminarArchivo(persistencia);

  const carpeta = await crearNodo.ejecutar({ nombre: 'Test EliminarArchivo', idPadre: 1 });
  const ruta = path.join(os.tmpdir(), `test-eliminar-${Date.now()}.txt`);
  fs.writeFileSync(ruta, 'hola');

  try {
    console.log('--- Eliminar archivo con archivo físico ---');
    const real = await crearArchivo.ejecutar({ nombre: 'real', extension: 'txt', rutaFisica: ruta, tamanio: 4, idPadre: carpeta.id });
    await eliminarArchivo.ejecutar({ id: real.id });
    await esperar(100); // el unlink no se espera dentro de ejecutar()
    console.log(fs.existsSync(ruta) ? 'NO se borró el archivo físico' : 'Registro y archivo físico eliminados OK');

    console.log('--- Eliminar archivo cuya ruta física no existe ---');
    const fantasma = await crearArchivo.ejecutar({ nombre: 'fantasma', extension: 'txt', rutaFisica: '/tmp/no-existe-123.txt', tamanio: 0, idPadre: carpeta.id });
    try {
      await eliminarArchivo.ejecutar({ id: fantasma.id });
      await esperar(100);
      console.log('No lanzó error: el registro se borra igual y el fallo solo se loguea');
    } catch (e: any) {
      console.log('Error:', e.message);
    }

    console.log('--- Eliminar archivo cuya ruta apunta a una carpeta ---');
    const dir = await crearArchivo.ejecutar({ nombre: 'dir', extension: 'txt', rutaFisica: os.tmpdir(), tamanio: 0, idPadre: carpeta.id });
    await eliminarArchivo.ejecutar({ id: dir.id });
    await esperar(100);
    console.log(fs.existsSync(os.tmpdir()) ? 'La carpeta sigue existiendo OK' : 'Se borró la carpeta temporal');

    console.log('--- Id inexistente ---');
    try {
      await eliminarArchivo.ejecutar({ id: 999999 });
      console.log('NO falló');
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Eliminar dos veces el mismo archivo ---');
    try {
      await eliminarArchivo.ejecutar({ id: real.id });
      console.log('NO falló');
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }
  } finally {
    if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    await persistencia.ejecutar('DELETE FROM archivos WHERE id_padre = $1', [carpeta.id]);
    await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = $1', [carpeta.id]);
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
