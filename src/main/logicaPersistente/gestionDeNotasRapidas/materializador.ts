import { NotaRapida } from './entidades';

export interface FilaNota {
  id_nota: number;
  id_nodo: number;
  texto: string;
  color: number;
  pos_x: number | null;
  pos_y: number | null;
  fecha_creacion: Date;
}

export function materializarNota(fila: FilaNota): NotaRapida {
  return {
    idNota: fila.id_nota,
    idNodo: fila.id_nodo,
    texto: fila.texto,
    color: fila.color,
    posX: fila.pos_x,
    posY: fila.pos_y,
    fechaCreacion: new Date(fila.fecha_creacion).toISOString(),
  };
}
