import type { Persistencia } from '../../persistencia/persistencia';
import { tablasDeLaBase } from './exportarBase';

// Columnas con rutas completas de la compu (fotos, fondos y portadas): al restaurar en otra compu
// se cambia la carpeta de datos vieja por la nueva.
const COLUMNAS_CON_RUTA: [string, string][] = [
  ['usuarios', 'foto_perfil'],
  ['usuarios', 'fondo_inicio'],
  ['portadas_proyecto', 'ruta'],
];

// Reemplaza TODO el contenido de la base por el de la copia, en una sola transacción:
// si algo falla, la base queda como estaba.
export class RestaurarBase {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(tablasCopia: Record<string, string>, carpetaVieja: string, carpetaNueva: string): Promise<void> {
    const [{ rolsuper }] = await this.persistencia.ejecutar<{ rolsuper: boolean }>(
      `SELECT rolsuper FROM pg_roles WHERE rolname = current_user`,
    );
    if (!rolsuper) throw new Error('No se puede restaurar: el usuario de la base no tiene permisos suficientes.');

    await this.persistencia.transaccion(async (tx) => {
      const actuales = await tablasDeLaBase(tx as Persistencia);
      // "replica": durante la carga no se controlan las claves foráneas ni corren los disparadores
      // (por ejemplo, los que anotan cambios para sincronizar proyectos).
      await tx.ejecutar(`SET LOCAL session_replication_role = replica`);
      if (actuales.length > 0) {
        await tx.ejecutar(`TRUNCATE ${actuales.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
      }

      for (const tabla of actuales) {
        const texto = tablasCopia[tabla];
        if (!texto) continue;
        const filas = JSON.parse(texto) as Record<string, unknown>[];
        if (filas.length === 0) continue;
        // Solo las columnas que existen en las dos (la copia puede ser de otra versión de Syntra).
        const columnasTabla = await tx.ejecutar<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1 AND is_generated = 'NEVER'`,
          [tabla],
        );
        const enCopia = new Set(Object.keys(filas[0]));
        const columnas = columnasTabla.map((c) => c.column_name).filter((c) => enCopia.has(c)).map((c) => `"${c}"`).join(', ');
        if (!columnas) continue;
        await tx.ejecutar(
          `INSERT INTO "${tabla}" (${columnas}) OVERRIDING SYSTEM VALUE
           SELECT ${columnas} FROM json_populate_recordset(NULL::"${tabla}", $1::json)`,
          [texto],
        );
      }

      // Los contadores de ids siguen desde el mayor id restaurado.
      const secuencias = await tx.ejecutar<{ tabla: string; columna: string; secuencia: string }>(
        `SELECT c.table_name AS tabla, c.column_name AS columna,
                pg_get_serial_sequence(format('%I', c.table_name), c.column_name) AS secuencia
           FROM information_schema.columns c
          WHERE c.table_schema = 'public'
            AND pg_get_serial_sequence(format('%I', c.table_name), c.column_name) IS NOT NULL`,
      );
      for (const s of secuencias) {
        if (!actuales.includes(s.tabla)) continue;
        await tx.ejecutar(
          `SELECT setval($1::regclass, COALESCE((SELECT max("${s.columna}") FROM "${s.tabla}"), 0) + 1, false)`,
          [s.secuencia],
        );
      }

      if (carpetaVieja && carpetaVieja !== carpetaNueva) {
        for (const [tabla, columna] of COLUMNAS_CON_RUTA) {
          const existe = await tx.ejecutar(
            `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
            [tabla, columna],
          );
          if (existe.length === 0) continue;
          await tx.ejecutar(
            `UPDATE "${tabla}" SET "${columna}" = $2 || substr("${columna}", length($1) + 1)
              WHERE left("${columna}", length($1)) = $1`,
            [carpetaVieja, carpetaNueva],
          );
        }
      }
    });
  }
}
