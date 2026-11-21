// Espejo de las notas rápidas que devuelve el main (gestionDeNotasRapidas/entidades.ts).
export interface NotaRapida {
  idNota: number;
  idNodo: number;
  texto: string;
  color: number; // 0 a 3: tonos pastel de la paleta elegida
  posX: number | null; // % del ancho; null = lugar por defecto
  posY: number | null; // píxeles desde arriba
  fechaCreacion: string;
}
