import { ListarDecks } from '../../logicaPersistente/gestionDeFlashcards/listarDecks';
import type { Persistencia } from '../../persistencia/Persistencia';
import { terminar, verificar } from '../materialEstudio/entornoTest';

// Permite verificar el usuario usado en la consulta y el resultado mapeado.
function crearPersistenciaFalsa(responder: (sql: string, valores: unknown[]) => Promise<any[]> = async () => []) {
  const consultas: { sql: string; valores: unknown[] }[] = [];
  const ejecutar = async (sql: string, valores: unknown[] = []) => {
    consultas.push({ sql, valores });
    return responder(sql, valores);
  };
  return { consultas, persistencia: { ejecutar } as unknown as Persistencia };
}

async function main(): Promise<void> {
  // El listado debe aislar al usuario y mostrar el resumen de cada mazo.
  const fechaRevision = new Date('2026-10-27T08:00:00Z');
  const { consultas, persistencia } = crearPersistenciaFalsa(async () => [{
    id_deck: 6, id_usuario: 5, nombre: 'Algoritmos', descripcion: 'Repaso',
    materia_asociada: null, fecha_creacion: new Date(), cantidad_flashcards: '2',
    ultima_revision: fechaRevision,
  }]);
  const resultado = await new ListarDecks(persistencia).ejecutar(5);

  verificar('Filtrar los mazos por usuario', /WHERE\s+d\.id_usuario\s*=\s*\$1/i.test(consultas[0].sql) &&
    consultas[0].valores[0] === 5);
  verificar('Materializar contador y última revisión',
    resultado[0].cantidadFlashcards === 2 && resultado[0].ultimaRevision === fechaRevision);

  // Un usuario nuevo y un mazo sin tarjetas son resultados válidos.
  const { persistencia: sinMazos } = crearPersistenciaFalsa();
  const listaVacia = await new ListarDecks(sinMazos).ejecutar(999);
  verificar('Usuario sin mazos recibe lista vacía', listaVacia.length === 0);

  const { persistencia: sinFlashcards } = crearPersistenciaFalsa(async () => [{
    id_deck: 8, id_usuario: 5, nombre: 'Nuevo', descripcion: null,
    materia_asociada: null, fecha_creacion: new Date(), cantidad_flashcards: 0,
    ultima_revision: null,
  }]);
  const mazosVacios = await new ListarDecks(sinFlashcards).ejecutar(5);
  verificar('Mazo sin tarjetas conserva contador cero y revisión null',
    mazosVacios[0].cantidadFlashcards === 0 && mazosVacios[0].ultimaRevision === null);
}

main().then(terminar).catch((error) => {
  console.error('MAL: Error al ejecutar las pruebas:', error);
  process.exitCode = 1;
});
