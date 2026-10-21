import { Categoria } from './entidades';

// Conviere en objeto de tipo Categoria en un registro de BD
export function materializarCategoria(fila: any): Categoria {
  return { id: fila.id, usuarioId: fila.usuario_id, nombre: fila.nombre };
}
