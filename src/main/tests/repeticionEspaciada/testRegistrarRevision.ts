import { registrarRevisionSchema } from '../../logicaPersistente/gestionDeRepeticionEspaciada/dto';
import { RegistrarRevision } from '../../logicaPersistente/gestionDeRepeticionEspaciada/registrarRevision';
import type { Persistencia } from '../../persistencia/Persistencia';
import { terminar, verificar } from '../materialEstudio/entornoTest';

// Guarda las consultas para revisar actualización, historial y filtros de propiedad.
function crearPersistenciaFalsa(
  responder: (sql: string, valores: unknown[]) => Promise<unknown[]> = async () => [],
) {
  const consultas: { sql: string; valores: unknown[] }[] = [];
  const ejecutar = async (sql: string, valores: unknown[] = []) => {
    consultas.push({ sql, valores });
    return responder(sql, valores);
  };
  return { consultas, persistencia: { ejecutar } as unknown as Persistencia };
}

async function main(): Promise<void> {
  // Cada dificultad debe aplicar el intervalo definido y persistir el historial.
  for (const [dificultad, dias] of [
    ['dificil', 1], ['intermedio', 3], ['facil', 6],
  ] as const) {
    const { consultas, persistencia } = crearPersistenciaFalsa();
    await new RegistrarRevision(persistencia).ejecutar({
      usuarioId: 7, flashcardId: 12, dificultad,
    });
    verificar(`Actualizar próxima fecha según dificultad ${dificultad}`,
      /UPDATE\s+flashcards/i.test(consultas[0].sql) &&
        consultas[0].valores[1] === dias &&
        /CURRENT_DATE/i.test(consultas[0].sql));
    verificar(`Guardar revisión ${dificultad} en historial`,
      /INSERT INTO\s+flashcard_revisiones/i.test(consultas[1].sql) &&
        consultas[1].valores[1] === dificultad &&
        consultas[1].valores[2] === dias);
  }

  for (const dificultad of ['dificil', 'intermedio', 'facil']) {
    verificar(`Aceptar dificultad de negocio "${dificultad}"`,
      registrarRevisionSchema.safeParse({
        usuarioId: 7, flashcardId: 12, dificultad,
      }).success);
  }

  // QA: una revisión no debe poder modificar una tarjeta de otro usuario.
  const { consultas: consultasAjeno, persistencia: persistenciaAjeno } = crearPersistenciaFalsa();
  await new RegistrarRevision(persistenciaAjeno).ejecutar({
    usuarioId: 7, flashcardId: 12, dificultad: 'facil',
  });
  verificar('BUG: impedir que el usuario registre revisión sobre flashcard ajena',
    /JOIN\s+decks/i.test(consultasAjeno[0].sql) &&
      /id_usuario\s*=\s*\$1/i.test(consultasAjeno[0].sql) &&
      consultasAjeno[0].valores.includes(7),
    'El UPDATE actual solo filtra por id_flashcard y no valida el dueño.');

  // QA: si el UPDATE no encuentra tarjeta, no debe añadirse una fila al historial.
  const { consultas: consultasInexistente, persistencia: persistenciaInexistente } =
    crearPersistenciaFalsa(async (sql) => {
      if (/UPDATE\s+flashcards/i.test(sql)) return [];
      return [];
    });
  await new RegistrarRevision(persistenciaInexistente).ejecutar({
    usuarioId: 7, flashcardId: 404, dificultad: 'dificil',
  });
  verificar('BUG: no registrar historial para flashcard inexistente',
    consultasInexistente.length === 1,
    `Se ejecutó también INSERT en historial (${consultasInexistente.length} consultas).`);

  // Un error del UPDATE debe detener el caso de uso antes de insertar el historial.
  const { consultas: consultasError, persistencia: persistenciaConError } =
    crearPersistenciaFalsa(async () => {
      throw new Error('Connection reset');
    });
  let mensajeError = '';
  try {
    await new RegistrarRevision(persistenciaConError).ejecutar({
      usuarioId: 7, flashcardId: 12, dificultad: 'dificil',
    });
  } catch (error) {
    mensajeError = error instanceof Error ? error.message : String(error);
  }
  verificar('No guardar historial si falla el UPDATE',
    mensajeError === 'Connection reset' && consultasError.length === 1, mensajeError);
}

main().then(terminar).catch((error) => {
  console.error('FALLO: Error al ejecutar las pruebas:', error);
  process.exitCode = 1;
});
