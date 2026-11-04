import { Categoria } from './entidades';

export const COLUMNAS_CATEGORIA = 'id, id_global, usuario_id, id_proyecto, nombre';

export function materializarCategoria(fila: any): Categoria {
  const c: Categoria = {
    id: fila.id,
    idGlobal: fila.id_global,
    usuarioId: fila.usuario_id ?? null,
    idProyecto: fila.id_proyecto ?? null,
    nombre: fila.nombre,
  };
  if ('nombre_proyecto' in fila) c.nombreProyecto = fila.nombre_proyecto ?? null;
  return c;
}