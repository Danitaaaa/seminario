import { eliminarFlashcardsSchema } from '../../logicaPersistente/gestionDeFlashcards/dto';
import { EliminarFlashcards } from '../../logicaPersistente/gestionDeFlashcards/eliminarFlashcards';
import type { Persistencia } from '../../persistencia/Persistencia';
import { terminar, verificar } from '../materialEstudio/entornoTest';

function crearPersistenciaFalsa(responder: (sql: string, valores: unknown[]) => Promise<any[]>) {
  const consultas: { sql: string; valores: unknown[] }[] = [];
  const ejecutar = async (sql: string, valores: unknown[] = []) => {
    consultas.push({ sql, valores });
    return responder(sql, valores);
  };
  return { consultas, persistencia: { ejecutar } as unknown as Persistencia };
}

async function main(): Promise<void> {
  const { consultas, persistencia } = crearPersistenciaFalsa(async () => [
    { id_flashcard: 11 },
    { id_flashcard: 12 },
  ]);
  const cantidad = await new EliminarFlashcards(persistencia).ejecutar({
    usuarioId: 9,
    flashcardIds: [11, 12],
  });
  verificar('Eliminar selección de flashcards y devolver cantidad', cantidad === 2);
  verificar('Eliminar solo flashcards que pertenecen a mazos del usuario',
    /DELETE FROM flashcards/i.test(consultas[0].sql) &&
    /USING decks/i.test(consultas[0].sql) &&
    /d\.id_usuario\s*=\s*\$1/i.test(consultas[0].sql) &&
    JSON.stringify(consultas[0].valores) === JSON.stringify([9, [11, 12]]));

  const { persistencia: sinCoincidencias } = crearPersistenciaFalsa(async () => []);
  const cantidadAjena = await new EliminarFlashcards(sinCoincidencias).ejecutar({
    usuarioId: 9,
    flashcardIds: [999],
  });
  verificar('No contar flashcards inexistentes o de otro usuario', cantidadAjena === 0);

  verificar('Rechazar selección de flashcards vacía',
    !eliminarFlashcardsSchema.safeParse({ usuarioId: 9, flashcardIds: [] }).success);
  verificar('Rechazar IDs de flashcard duplicados',
    !eliminarFlashcardsSchema.safeParse({ usuarioId: 9, flashcardIds: [11, 11] }).success);
}

main().then(terminar).catch((error) => {
  console.error('MAL: Error al ejecutar las pruebas:', error);
  process.exitCode = 1;
});
