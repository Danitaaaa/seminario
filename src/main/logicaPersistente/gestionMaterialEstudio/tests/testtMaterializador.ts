import {
  materializarNodo,
  desmaterializarNodo,
  materializarArchivo,
  desmaterializarArchivo,
} from '../materializador';

// Test del materializador: funciones puras, no necesita base de datos.
function main() {
  const fecha = new Date('2026-01-01T10:00:00Z');

  const filaNodo = {
    id_nodo: 5,
    nombre: 'Matemática',
    fecha_carga: fecha,
    ultima_fecha_acceso: fecha,
    ultima_fecha_modificacion: fecha,
    tamaño: '0', // pg devuelve BIGINT como string
    id_padre: 1,
  };

  const filaArchivo = {
    id_archivo: 7,
    nombre: 'apunte',
    extension: 'pdf',
    ruta_fisica: '/tmp/apunte.pdf',
    tamaño: '1024',
    fecha_carga: fecha,
    ultima_fecha_acceso: fecha,
    ultima_fecha_modificacion: fecha,
    id_padre: 5,
  };

  console.log('--- materializarNodo ---');
  const nodo = materializarNodo(filaNodo);
  console.log(nodo);
  console.log('Tipo de tamaño:', typeof nodo.tamaño, '(la entidad dice BigInt)');

  console.log('--- Ida y vuelta de nodo ---');
  console.log(JSON.stringify(desmaterializarNodo(nodo)) === JSON.stringify(filaNodo) ? 'OK' : 'Distinto');

  console.log('--- materializarArchivo ---');
  const archivo = materializarArchivo(filaArchivo);
  console.log(archivo);
  console.log(archivo.tamanio === 1024 ? 'tamaño convertido a number OK' : 'tamaño mal convertido');

  console.log('--- Ida y vuelta de archivo ---');
  const vuelta = desmaterializarArchivo(archivo);
  console.log(vuelta.tamaño === 1024 && vuelta.id_archivo === 7 ? 'OK' : 'Distinto', vuelta);

  console.log('--- Archivo con tamaño mayor a 2^53 ---');
  const enorme = materializarArchivo({ ...filaArchivo, tamaño: '9007199254740993' });
  console.log(String(enorme.tamanio) === '9007199254740993' ? 'OK' : `Pierde precisión: ${enorme.tamanio}`);

  console.log('--- Archivo con tamaño null ---');
  console.log('tamanio:', materializarArchivo({ ...filaArchivo, tamaño: null }).tamanio);

  console.log('--- Archivo con tamaño no numérico ---');
  console.log('tamanio:', materializarArchivo({ ...filaArchivo, tamaño: 'abc' }).tamanio);

  console.log('--- Fila vacía {} ---');
  console.log(materializarNodo({}));

  console.log('--- Fila undefined (lo que pasa si la query no devuelve filas) ---');
  try {
    console.log('NO falló:', materializarNodo(undefined));
  } catch (e: any) {
    console.log('Error:', e.message);
  }
  try {
    console.log('NO falló:', materializarArchivo(undefined));
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}

main();
