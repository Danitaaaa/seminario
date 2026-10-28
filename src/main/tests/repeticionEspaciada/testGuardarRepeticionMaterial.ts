import { guardarRepeticionMaterialSchema } from '../../logicaPersistente/gestionDeRepeticionEspaciada/dto';
import { GuardarRepeticionMaterial } from '../../logicaPersistente/gestionDeRepeticionEspaciada/guardarRepeticionMaterial';
import type { Persistencia } from '../../persistencia/Persistencia';
import { terminar, verificar } from '../materialEstudio/entornoTest';

// Guarda cada consulta para comprobar inserción y actualización del material.
function crearPersistenciaFalsa(responder: (sql: string, valores: unknown[]) => Promise<any[]> = async () => []) {
  const consultas: { sql: string; valores: unknown[] }[] = [];
  const ejecutar = async (sql: string, valores: unknown[] = []) => {
    consultas.push({ sql, valores });
    return responder(sql, valores);
  };
  return { consultas, persistencia: { ejecutar } as unknown as Persistencia };
}

async function main(): Promise<void> {
  // Los únicos intervalos aceptados por la regla de negocio son 1, 3, 7 y 14.
  for (const intervaloDias of [1, 3, 7, 14] as const) {
    const { consultas, persistencia } = crearPersistenciaFalsa();
    await new GuardarRepeticionMaterial(persistencia).ejecutar({
      usuarioId: 7, nodoId: 12, intervaloDias,
    });
    const consulta = consultas[0];
    verificar(`Guardar intervalo permitido de ${intervaloDias} días`,
      /INSERT INTO\s+repeticiones_material/i.test(consulta.sql) &&
        JSON.stringify(consulta.valores) === JSON.stringify([7, 12, intervaloDias]));
    verificar(`Actualizar repetición existente con intervalo ${intervaloDias}`,
      /ON CONFLICT\s*\(\s*id_usuario,\s*id_nodo\s*\)\s*DO UPDATE/i.test(consulta.sql) &&
        /intervalo_dias\s*=\s*EXCLUDED\.intervalo_dias/i.test(consulta.sql) &&
        /proxima_revision\s*=\s*EXCLUDED\.proxima_revision/i.test(consulta.sql));
  }

  // La validación también debe rechazar números fuera de rango y tipos inesperados.
  for (const intervaloDias of [0, 2, 6, 8, 15, -1, 1.5, '7', null]) {
    verificar(`Rechazar intervalo fuera de regla: ${String(intervaloDias)}`,
      !guardarRepeticionMaterialSchema.safeParse({
        usuarioId: 7, nodoId: 12, intervaloDias,
      }).success);
  }

  // El cast permite a PostgreSQL resolver la suma de fecha e intervalo de días.
  const { consultas, persistencia } = crearPersistenciaFalsa();
  await new GuardarRepeticionMaterial(persistencia).ejecutar({
    usuarioId: 7, nodoId: 12, intervaloDias: 3,
  });
  verificar('Sumar a la fecha el intervalo con tipo entero explícito',
    /\$3\s*::\s*integer/i.test(consultas[0].sql),
    consultas[0].sql);

  // Los errores reales de persistencia deben propagarse al llamador.
  const { consultas: consultasError, persistencia: persistenciaConError } =
    crearPersistenciaFalsa(async () => {
      throw new Error('Connection reset');
    });
  let mensajeError = '';
  try {
    await new GuardarRepeticionMaterial(persistenciaConError).ejecutar({
      usuarioId: 7, nodoId: 12, intervaloDias: 3,
    });
  } catch (error) {
    mensajeError = error instanceof Error ? error.message : String(error);
  }
  verificar('Propagar el error si falla la persistencia',
    mensajeError === 'Connection reset' && consultasError.length === 1, mensajeError);
}

main().then(terminar).catch((error) => {
  console.error('FALLO: Error al ejecutar las pruebas:', error);
  process.exitCode = 1;
});
