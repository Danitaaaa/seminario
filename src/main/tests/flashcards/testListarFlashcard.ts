import { ListarFlashcards } from '../../logicaPersistente/gestionDeFlashcards/listarFlashcards';
import type { Persistencia } from '../../persistencia/Persistencia';
import { terminar, verificar } from '../materialEstudio/entornoTest';

// Registra las consultas para revisar el filtro de usuario y mazo.
function crearPersistenciaFalsa(responder: (sql: string, valores: unknown[]) => Promise<any[]> = async () => []) {
  const consultas: { sql: string; valores: unknown[] }[] = [];
  const ejecutar = async (sql: string, valores: unknown[] = []) => {
    consultas.push({ sql, valores });
    return responder(sql, valores);
  };
  return { consultas, persistencia: { ejecutar } as unknown as Persistencia };
}

async function main(): Promise<void> {
  // La lista debe conservar orden estable y nunca mezclar tarjetas de otros mazos.
  const filas = [
    { id_flashcard: 2, id_deck: 3, pregunta: 'A', respuesta: '1', fecha_creacion: new Date('2026-10-25') },
    { id_flashcard: 4, id_deck: 3, pregunta: 'B', respuesta: '2', fecha_creacion: new Date('2026-10-26') },
  ];
  const { consultas, persistencia } = crearPersistenciaFalsa(async () => filas);
  const resultado = await new ListarFlashcards(persistencia).ejecutar(7, 3);

  verificar('Restringir la consulta al usuario y mazo', /d\.id_usuario\s*=\s*\$1/i.test(consultas[0].sql) &&
    /d\.id_deck\s*=\s*\$2/i.test(consultas[0].sql) &&
    JSON.stringify(consultas[0].valores) === JSON.stringify([7, 3]));
  verificar('Ordenar por fecha y desempatar por ID',
    /ORDER BY f\.fecha_creacion,\s*f\.id_flashcard/i.test(consultas[0].sql));
  verificar('Mapear tarjetas en orden estable',
    resultado.map((tarjeta) => tarjeta.idFlashcard).join(',') === '2,4');

  const { persistencia: sinTarjetas } = crearPersistenciaFalsa();
  verificar('Mazo ajeno/inexistente produce lista vacía',
    (await new ListarFlashcards(sinTarjetas).ejecutar(7, 404)).length === 0);

  // Un fallo real de base debe propagarse y no convertirse en una lista vacía.
  const { persistencia: dbCaida } = crearPersistenciaFalsa(async () => {
    throw new Error('DB desconectada');
  });
  try {
    await new ListarFlashcards(dbCaida).ejecutar(7, 3);
    verificar('Propagar caída de persistencia', false, 'La consulta no propagó el error.');
  } catch (error) {
    verificar('Propagar caída de persistencia',
      error instanceof Error && error.message === 'DB desconectada', error);
  }
}

main().then(terminar).catch((error) => {
  console.error('MAL: Error al ejecutar las pruebas:', error);
  process.exitCode = 1;
});
