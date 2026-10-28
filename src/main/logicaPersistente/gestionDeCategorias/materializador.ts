import { Categoria } from './entidades';

// Convierte un registro de la BD a un objeto del tipo Categoría
export function materializarCategoria(fila: any): Categoria {
  return { id: fila.id, usuarioId: fila.usuario_id, nombre: fila.nombre };
}
