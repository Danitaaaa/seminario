import { Meta } from './entidades';

// Columnas a pedir en cada SELECT / RETURNING: `mes` (DATE) se entrega además como texto AAAA-MM,
// para evitar problemas de zona horaria al convertir DATE a Date en el driver.
export const COLUMNAS_META = `*, to_char(mes, 'YYYY-MM') AS mes_texto,
    (SELECT to_char(t.mes, 'YYYY-MM') FROM metas t
      WHERE t.id_meta_origen = metas.id_meta AND NOT metas.completada
      LIMIT 1) AS trasladada_a`;

// Convierte un mes AAAA-MM al primer día de ese mes (formato que se guarda en la BD)
export function mesAFecha(mes: string): string {
    return `${mes}-01`;
}

// Convierte el registro de una meta de la BD a un objeto Meta
export function materializarMeta(fila: any): Meta {
    return {
        idMeta: fila.id_meta,
        idProyecto: fila.id_proyecto ?? null,
        titulo: fila.titulo,
        descripcion: fila.descripcion ?? null,
        mes: fila.mes_texto,
        completada: fila.completada,
        fechaCompletada: fila.fecha_completada ?? null,
        completadaPor: fila.completada_por ?? null,
        orden: fila.orden,
        creadaPor: fila.creada_por,
        fechaCreacion: fila.fecha_creacion,
        trasladadaA: fila.trasladada_a ?? null,
        idMetaOrigen: fila.id_meta_origen ?? null,
    };
}