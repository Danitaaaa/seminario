import { ListarRepeticionesMaterial } from '../../logicaPersistente/gestionDeRepeticionEspaciada/listarRepeticionesMaterial';
import type { Persistencia } from '../../persistencia/Persistencia';
import { terminar, verificar } from '../materialEstudio/entornoTest';

// Simula el listado para comprobar usuario, orden y datos asociados.
function crearPersistenciaFalsa(responder: (sql: string, valores: unknown[]) => Promise<any[]> = async () => []) {
  const consultas: { sql: string; valores: unknown[] }[] = [];
  const ejecutar = async (sql: string, valores: unknown[] = []) => {
    consultas.push({ sql, valores });
    return responder(sql, valores);
  };
  return { consultas, persistencia: { ejecutar } as unknown as Persistencia };
}

async function main(): Promise<void> {
  // El material listado debe incluir su intervalo y próxima fecha de repaso.
  const proximaRevision = new Date('2026-11-03');
  const { consultas, persistencia } = crearPersistenciaFalsa(async () => [{
    id_nodo: 3, nombre: 'Unidad 1', intervalo_dias: 7, proxima_revision: proximaRevision,
  }]);
  const repeticiones = await new ListarRepeticionesMaterial(persistencia).ejecutar(5);
  const consulta = consultas[0];

  verificar('Listar solo las repeticiones del usuario',
    /r\.id_usuario\s*=\s*\$1/i.test(consulta.sql) &&
      JSON.stringify(consulta.valores) === JSON.stringify([5]));
  verificar('Obtener el nombre del nodo existente',
    /INNER JOIN nodos n ON n\.id_nodo = r\.id_nodo/i.test(consulta.sql));
  verificar('Ordenar material por próxima fecha y nombre',
    /ORDER BY r\.proxima_revision,\s*n\.nombre/i.test(consulta.sql));
  verificar('Devolver nodo, intervalo y próxima fecha',
    repeticiones.length === 1 &&
      repeticiones[0].nodoId === 3 &&
      repeticiones[0].nombre === 'Unidad 1' &&
      repeticiones[0].intervaloDias === 7 &&
      repeticiones[0].proximaRevision === proximaRevision);

  // No tener configuraciones de repaso debe devolver una lista vacía.
  const { persistencia: sinRepeticiones } = crearPersistenciaFalsa();
  verificar('Devolver lista vacía cuando el usuario no configuró materiales',
    (await new ListarRepeticionesMaterial(sinRepeticiones).ejecutar(5)).length === 0);

  // Un fallo de base de datos no debe confundirse con una lista sin resultados.
  const { consultas: consultasError, persistencia: persistenciaConError } =
    crearPersistenciaFalsa(async () => {
      throw new Error('Connection reset');
    });
  let mensajeError = '';
  try {
    await new ListarRepeticionesMaterial(persistenciaConError).ejecutar(5);
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
