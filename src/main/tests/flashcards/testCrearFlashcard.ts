import { crearFlashcardSchema } from '../../logicaPersistente/gestionDeFlashcards/dto';
import { CrearFlashcard } from '../../logicaPersistente/gestionDeFlashcards/crearFlashcard';
import type { Persistencia } from '../../persistencia/Persistencia';
import { terminar, verificar } from '../materialEstudio/entornoTest';

// Simula la persistencia y conserva parámetros para comprobar el aislamiento.
function crearPersistenciaFalsa(responder: (sql: string, valores: unknown[]) => Promise<any[]> = async () => []) {
  const consultas: { sql: string; valores: unknown[] }[] = [];
  const ejecutar = async (sql: string, valores: unknown[] = []) => {
    consultas.push({ sql, valores });
    return responder(sql, valores);
  };
  return { consultas, persistencia: { ejecutar } as unknown as Persistencia };
}

async function main(): Promise<void> {
  // Comprueba la creación válida y la asociación con un mazo del usuario.
  const fila = {
    id_flashcard: 12, id_deck: 3, pregunta: '¿Qué es una base de datos?',
    respuesta: 'Un conjunto organizado de datos.', fecha_creacion: new Date(),
  };
  const { consultas, persistencia } = crearPersistenciaFalsa(async () => [fila]);
  const resultado = await new CrearFlashcard(persistencia).ejecutar({
    usuarioId: 7, deckId: 3, pregunta: fila.pregunta, respuesta: fila.respuesta,
  });
  verificar('Crear flashcard y mantener su mazo', resultado.idFlashcard === 12 && resultado.deckId === 3);
  verificar('Insertar únicamente en mazo propiedad del usuario',
    /d\.id_usuario\s*=\s*\$1/i.test(consultas[0].sql) &&
    JSON.stringify(consultas[0].valores) === JSON.stringify([7, 3, fila.pregunta, fila.respuesta]));

  // Verifica el límite permitido y los mensajes para campos requeridos.
  const maximos = crearFlashcardSchema.safeParse({
    usuarioId: 1, deckId: 2, pregunta: `  ${'q'.repeat(250)}  `,
    respuesta: ` ${'r'.repeat(2000)} `,
  });
  verificar('Recortar espacios y aceptar longitud máxima',
    maximos.success && maximos.data.pregunta.length === 250 &&
    maximos.data.respuesta.length === 2000);

  verificar('Mostrar mensaje cuando pregunta está vacía',
    crearFlashcardSchema.safeParse({
      usuarioId: 1, deckId: 2, pregunta: '', respuesta: 'R',
    }).error?.issues[0]?.message === 'La pregunta es obligatoria.');
  verificar('Mostrar mensaje cuando respuesta está vacía',
    crearFlashcardSchema.safeParse({
      usuarioId: 1, deckId: 2, pregunta: 'P', respuesta: '',
    }).error?.issues[0]?.message === 'La respuesta es obligatoria.');
  verificar('Mostrar mensaje cuando falta una pregunta',
    crearFlashcardSchema.safeParse({
      usuarioId: 1, deckId: 2, respuesta: 'R',
    }).error?.issues[0]?.message === 'La pregunta es obligatoria.');
  verificar('Mostrar mensaje cuando falta una respuesta',
    crearFlashcardSchema.safeParse({
      usuarioId: 1, deckId: 2, pregunta: 'P',
    }).error?.issues[0]?.message === 'La respuesta es obligatoria.');
  verificar('Mostrar mensaje para pregunta mayor a 250 caracteres',
    crearFlashcardSchema.safeParse({
      usuarioId: 1, deckId: 2, pregunta: 'P'.repeat(251), respuesta: 'R',
    }).error?.issues[0]?.message === 'La pregunta no puede superar los 250 caracteres.');
  verificar('Mostrar mensaje para respuesta mayor a 2000 caracteres',
    crearFlashcardSchema.safeParse({
      usuarioId: 1, deckId: 2, pregunta: 'P', respuesta: 'R'.repeat(2001),
    }).error?.issues[0]?.message === 'La respuesta no puede superar los 2000 caracteres.');

  // Entradas inesperadas deben ser rechazadas por el esquema.
  for (const datos of [
    { usuarioId: 0, deckId: 1, pregunta: 'P', respuesta: 'R' },
    { usuarioId: 1, deckId: 0, pregunta: 'P', respuesta: 'R' },
    { usuarioId: 1, deckId: 1, pregunta: '   ', respuesta: 'R' },
    { usuarioId: 1, deckId: 1, pregunta: 'P', respuesta: '\n  ' },
    { usuarioId: 1, deckId: 1, pregunta: 'P'.repeat(251), respuesta: 'R' },
    { usuarioId: 1, deckId: 1, pregunta: 'P', respuesta: 'R'.repeat(2001) },
  ]) {
    verificar(`Rechazar entrada inválida ${JSON.stringify(datos).slice(0, 250)}`,
      !crearFlashcardSchema.safeParse(datos).success);
  }

  const { persistencia: persistenciaSinMazo } = crearPersistenciaFalsa();
  let mensajeMazoInexistente = '';
  try {
    await new CrearFlashcard(persistenciaSinMazo).ejecutar({
      usuarioId: 7, deckId: 404, pregunta: 'Pregunta', respuesta: 'Respuesta',
    });
  } catch (error) {
    mensajeMazoInexistente = error instanceof Error ? error.message : String(error);
  }
  verificar('Mazo inexistente o ajeno devuelve error explícito',
    /no se encontró el mazo/i.test(mensajeMazoInexistente), mensajeMazoInexistente);
}

main().then(terminar).catch((error) => {
  console.error('MAL: Error al ejecutar las pruebas:', error);
  process.exitCode = 1;
});
