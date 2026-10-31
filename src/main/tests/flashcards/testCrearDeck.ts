import { crearDeckSchema } from '../../logicaPersistente/gestionDeFlashcards/dto';
import { CrearDeck } from '../../logicaPersistente/gestionDeFlashcards/crearDeck';
import type { Persistencia } from '../../persistencia/Persistencia';
import { terminar, verificar } from '../materialEstudio/entornoTest';

// Registra las consultas para comprobar la persistencia sin tocar la base real.
function crearPersistenciaFalsa(responder: (sql: string, valores: unknown[]) => Promise<any[]> = async () => []) {
  const consultas: { sql: string; valores: unknown[] }[] = [];
  const ejecutar = async (sql: string, valores: unknown[] = []) => {
    consultas.push({ sql, valores });
    return responder(sql, valores);
  };
  return { consultas, persistencia: { ejecutar } as unknown as Persistencia };
}

async function main(): Promise<void> {
  // La fila de retorno permite verificar el mapeo del mazo creado.
  const fila = {
    id_deck: 4,
    id_usuario: 9,
    nombre: 'Bases de datos',
    descripcion: null,
    materia_asociada: 'Sistemas',
    fecha_creacion: new Date('2026-10-27T12:00:00Z'),
  };
  const { consultas, persistencia } = crearPersistenciaFalsa(async () => [fila]);
  const resultado = await new CrearDeck(persistencia).ejecutar({
    usuarioId: 9,
    nombre: 'Bases de datos',
    materiaAsociada: 'Sistemas',
  });

  verificar('Crear mazo válido y materializar datos', resultado.idDeck === 4 && resultado.usuarioId === 9);
  verificar('Insertar mazo con parámetros', consultas[0].sql.includes('INSERT INTO decks') &&
    JSON.stringify(consultas[0].valores) === JSON.stringify([9, 'Bases de datos', null, 'Sistemas']));
  // Casos de borde del nombre y mensajes que debe mostrar el formulario.
  verificar('Aceptar nombre de 100 caracteres y rechazar 101', crearDeckSchema.safeParse({
    usuarioId: 1, nombre: 'x'.repeat(100),
  }).success && !crearDeckSchema.safeParse({
    usuarioId: 1, nombre: 'x'.repeat(101),
  }).success);
  verificar('Mostrar mensaje cuando el nombre está vacío',
    crearDeckSchema.safeParse({ usuarioId: 1, nombre: '' }).error?.issues[0]?.message === 'El nombre del mazo es obligatorio.');
  verificar('Mostrar mensaje cuando falta el nombre',
    crearDeckSchema.safeParse({ usuarioId: 1 }).error?.issues[0]?.message === 'El nombre del mazo es obligatorio.');
  verificar('Mostrar mensaje cuando el nombre supera 100 caracteres',
    crearDeckSchema.safeParse({ usuarioId: 1, nombre: 'x'.repeat(101) }).error?.issues[0]?.message === 'El nombre del mazo no puede superar los 100 caracteres.');

  for (const datos of [
    { usuarioId: 0, nombre: 'Mazo' },
    { usuarioId: -1, nombre: 'Mazo' },
    { usuarioId: 1.5, nombre: 'Mazo' },
    { usuarioId: 1, nombre: '' },
    { usuarioId: 1, nombre: 'x'.repeat(101) },
    { usuarioId: 1, nombre: 'Mazo', materiaAsociada: 'm'.repeat(101) },
  ]) {
    verificar(`Rechazar datos inválidos ${JSON.stringify(datos)}`,
      !crearDeckSchema.safeParse(datos).success);
  }

  verificar('Rechazar nombre compuesto solo por espacios',
    !crearDeckSchema.safeParse({ usuarioId: 1, nombre: '   ' }).success,
    'No debe permitir nombres visualmente vacíos.');
}

main().then(terminar).catch((error) => {
  console.error('MAL: Error al ejecutar las pruebas:', error);
  process.exitCode = 1;
});
