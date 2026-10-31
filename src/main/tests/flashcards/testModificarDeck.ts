import { modificarDeckSchema } from '../../logicaPersistente/gestionDeFlashcards/dto';
import { ModificarDeck } from '../../logicaPersistente/gestionDeFlashcards/modificarDeck';
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
  const { consultas, persistencia } = crearPersistenciaFalsa(async () => [{ id_deck: 8 }]);
  await new ModificarDeck(persistencia).ejecutar({
    usuarioId: 3,
    deckId: 8,
    nombre: 'Bases de datos',
  });
  verificar('Actualizar nombre del mazo del usuario', consultas[0].sql.includes('UPDATE decks') &&
    /id_usuario\s*=\s*\$1/i.test(consultas[0].sql) &&
    JSON.stringify(consultas[0].valores) === JSON.stringify([3, 8, 'Bases de datos']));

  const { persistencia: sinMazo } = crearPersistenciaFalsa(async () => []);
  let errorMazoInexistente = '';
  try {
    await new ModificarDeck(sinMazo).ejecutar({ usuarioId: 3, deckId: 999, nombre: 'Mazo' });
  } catch (error) {
    errorMazoInexistente = error instanceof Error ? error.message : String(error);
  }
  verificar('Rechazar edición de mazo inexistente o ajeno',
    /no se encontró el mazo/i.test(errorMazoInexistente), errorMazoInexistente);

  verificar('Aceptar nombre de mazo de 100 caracteres',
    modificarDeckSchema.safeParse({ usuarioId: 1, deckId: 1, nombre: 'x'.repeat(100) }).success);
  verificar('Rechazar nombre de mazo de 101 caracteres',
    !modificarDeckSchema.safeParse({ usuarioId: 1, deckId: 1, nombre: 'x'.repeat(101) }).success);
  verificar('Rechazar nombre de mazo vacío',
    !modificarDeckSchema.safeParse({ usuarioId: 1, deckId: 1, nombre: '  ' }).success);
}

main().then(terminar).catch((error) => {
  console.error('MAL: Error al ejecutar las pruebas:', error);
  process.exitCode = 1;
});
