import { Saludo } from './entidades';

export function materializarSaludo(fila: any): Saludo {
  return {
    id: fila.id,
    mensaje: fila.mensaje,
    creadoEn: fila.creado_en,
  };
}
