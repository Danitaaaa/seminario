import { eliminarDecksSchema } from '../../logicaPersistente/gestionDeFlashcards/dto';
import { EliminarDecks } from '../../logicaPersistente/gestionDeFlashcards/eliminarDecks';
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
    { id_deck: 4 },
    { id_deck: 5 },
  ]);
  const cantidad = await new EliminarDecks(persistencia).ejecutar({
    usuarioId: 7,
    deckIds: [4, 5],
  });
  verificar('Eliminar selección de mazos y devolver cantidad', cantidad === 2);
  verificar('Limitar eliminación a mazos propiedad del usuario',
    /DELETE FROM decks/i.test(consultas[0].sql) &&
    /id_usuario\s*=\s*\$1/i.test(consultas[0].sql) &&
    JSON.stringify(consultas[0].valores) === JSON.stringify([7, [4, 5]]));

  const { persistencia: sinCoincidencias } = crearPersistenciaFalsa(async () => []);
  const cantidadAjena = await new EliminarDecks(sinCoincidencias).ejecutar({
    usuarioId: 7,
    deckIds: [99],
  });
  verificar('No contar mazos inexistentes o de otro usuario', cantidadAjena === 0);

  verificar('Rechazar selección de mazos vacía',
    !eliminarDecksSchema.safeParse({ usuarioId: 7, deckIds: [] }).success);
  verificar('Rechazar IDs de mazo duplicados',
    !eliminarDecksSchema.safeParse({ usuarioId: 7, deckIds: [4, 4] }).success);
}

main().then(terminar).catch((error) => {
  console.error('MAL: Error al ejecutar las pruebas:', error);
  process.exitCode = 1;
});
