import { ListarFlashcardsPendientes } from '../../logicaPersistente/gestionDeRepeticionEspaciada/listarFlashcardsPendientes';
import type { Persistencia } from '../../persistencia/Persistencia';
import { terminar, verificar } from '../materialEstudio/entornoTest';

// Permite controlar las filas devueltas por la consulta de repaso.
function crearPersistenciaFalsa(responder: (sql: string, valores: unknown[]) => Promise<any[]> = async () => []) {
  const consultas: { sql: string; valores: unknown[] }[] = [];
  const ejecutar = async (sql: string, valores: unknown[] = []) => {
    consultas.push({ sql, valores });
    return responder(sql, valores);
  };
  return { consultas, persistencia: { ejecutar } as unknown as Persistencia };
}

async function main(): Promise<void> {
  // Un vencimiento de hoy debe aparecer dentro de la lista del usuario correcto.
  const vencimiento = new Date('2026-10-27');
  const { consultas, persistencia } = crearPersistenciaFalsa(async () => [{
    id_flashcard: 2, id_deck: 4, nombre_deck: 'Base de Datos',
    pregunta: '¿Qué es una base de datos?', respuesta: 'Datos organizados.',
    proxima_revision: vencimiento, ultima_revision: null, ultimo_resultado: 'dificil',
  }]);
  const pendientes = await new ListarFlashcardsPendientes(persistencia).ejecutar(9);
  const consulta = consultas[0];

  verificar('Listar solo flashcards del usuario',
    /d\.id_usuario\s*=\s*\$1/i.test(consulta.sql) &&
      JSON.stringify(consulta.valores) === JSON.stringify([9]));
  verificar('Incluir contenido vencido hasta hoy',
    /f\.proxima_revision\s*<=\s*CURRENT_DATE/i.test(consulta.sql));
  verificar('Ordenar repasos por vencimiento',
    /ORDER BY f\.proxima_revision,\s*d\.nombre,\s*f\.id_flashcard/i.test(consulta.sql));
  verificar('Devolver los datos necesarios para estudiar',
    pendientes.length === 1 &&
      pendientes[0].idFlashcard === 2 &&
      pendientes[0].deckId === 4 &&
      pendientes[0].nombreDeck === 'Base de Datos' &&
      pendientes[0].pregunta === '¿Qué es una base de datos?' &&
      pendientes[0].ultimoResultado === 'dificil');
  verificar('Conservar fecha de vencimiento devuelta por PostgreSQL',
    pendientes[0].proximaRevision === vencimiento);

  // La lista vacía es válida cuando no hay tarjetas vencidas.
  const { persistencia: sinPendientes } = crearPersistenciaFalsa();
  verificar('Devolver lista vacía si no hay repasos vencidos',
    (await new ListarFlashcardsPendientes(sinPendientes).ejecutar(9)).length === 0);

  // No ocultar fallos de conexión como si el usuario no tuviera repasos.
  const { consultas: consultasError, persistencia: persistenciaConError } =
    crearPersistenciaFalsa(async () => {
      throw new Error('Connection reset');
    });
  let mensajeError = '';
  try {
    await new ListarFlashcardsPendientes(persistenciaConError).ejecutar(9);
  } catch (error) {
    mensajeError = error instanceof Error ? error.message : String(error);
  }
  verificar('Propagar error real de persistencia',
    mensajeError === 'Connection reset' && consultasError.length === 1, mensajeError);
}

main().then(terminar).catch((error) => {
  console.error('FALLO: Error al ejecutar las pruebas:', error);
  process.exitCode = 1;
});
