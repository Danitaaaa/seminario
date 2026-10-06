import { Categoria } from './entidades';

export function materializarCategoria(fila: any): Categoria {
  return { id: fila.id, usuarioId: fila.usuario_id, nombre: fila.nombre };
}
