import { Meta } from './entidades';

// pg devuelve las columnas DATE como Date a la medianoche local: se pasan a AAAA-MM-DD sin cambiar de día.
function aTextoFecha(valor: Date | string | null): string | null {
  if (!valor) return null;
  if (typeof valor === 'string') return valor.slice(0, 10);
  const mes = String(valor.getMonth() + 1).padStart(2, '0');
  const dia = String(valor.getDate()).padStart(2, '0');
  return `${valor.getFullYear()}-${mes}-${dia}`;
}

// Convierte un registro de la BD en un objeto Meta
export function materializarMeta(fila: any): Meta {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    titulo: fila.titulo,
    fechaLimite: aTextoFecha(fila.fecha_limite),
    completada: fila.completada,
    fechaCreacion: fila.fecha_creacion,
  };
}