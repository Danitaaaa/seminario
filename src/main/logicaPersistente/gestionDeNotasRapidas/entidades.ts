export interface NotaRapida {
  idNota: number;
  idNodo: number;
  texto: string;
  color: number;
  posX: number | null; // null = lugar por defecto
  posY: number | null;
  fechaCreacion: string;
}
