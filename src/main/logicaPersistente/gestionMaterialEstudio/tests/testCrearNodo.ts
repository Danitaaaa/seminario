import { pool, verifyDbConnection } from '../../../persistencia/baseDeDatos';
import { Persistencia } from '../../../persistencia/persistencia';
import { CrearNodo } from '../crearNodo';

// Test de CrearNodo: casos normales y casos que intentan romperlo.
async function main() {
  await verifyDbConnection();
  const persistencia = new Persistencia(pool);
  const crearNodo = new CrearNodo(persistencia);
  const creados: number[] = [];

  try {
    console.log('--- Crear carpeta en raíz (id 1) ---');
    const carpeta = await crearNodo.ejecutar({ nombre: 'Test CrearNodo', idPadre: 1 });
    creados.push(carpeta.id);
    console.log(carpeta);

    console.log('--- Crear subcarpeta ---');
    const hijo = await crearNodo.ejecutar({ nombre: 'Sub', idPadre: carpeta.id });
    creados.unshift(hijo.id);
    console.log(hijo);

    console.log('--- Crear con idPadre null (otra raíz) ---');
    const otraRaiz = await crearNodo.ejecutar({ nombre: 'Raíz suelta', idPadre: null });
    creados.unshift(otraRaiz.id);
    console.log(otraRaiz);

    console.log('--- Nombre duplicado en la misma carpeta ---');
    try {
      const dup = await crearNodo.ejecutar({ nombre: 'Sub', idPadre: carpeta.id });
      creados.unshift(dup.id);
      console.log('NO falló: permite carpetas con el mismo nombre en el mismo padre', dup);
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Nombre vacío (el DTO lo frena, la lógica no) ---');
    try {
      const vacio = await crearNodo.ejecutar({ nombre: '', idPadre: carpeta.id });
      creados.unshift(vacio.id);
      console.log('NO falló: permite nombre vacío', vacio);
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Nombre de 256 caracteres ---');
    try {
      const largo = await crearNodo.ejecutar({ nombre: 'a'.repeat(256), idPadre: carpeta.id });
      creados.unshift(largo.id);
      console.log('NO falló', largo);
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }

    console.log('--- Nombre con caracteres raros / intento de inyección SQL ---');
    const raro = await crearNodo.ejecutar({ nombre: "'); DROP TABLE nodos; --", idPadre: carpeta.id });
    creados.unshift(raro.id);
    console.log(raro);

    console.log('--- idPadre inexistente ---');
    try {
      const huerfano = await crearNodo.ejecutar({ nombre: 'Huérfano', idPadre: 999999 });
      creados.unshift(huerfano.id);
      console.log('NO falló', huerfano);
    } catch (e: any) {
      console.log('Error esperado:', e.message);
    }
  } finally {
    for (const id of creados) {
      await persistencia.ejecutar('DELETE FROM nodos WHERE id_nodo = $1', [id]);
    }
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
