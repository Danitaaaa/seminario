export interface Meta {
  idMeta: number;
  idProyecto: number;
  titulo: string;
  descripcion: string | null;
  mes: string; // AAAA-MM
  completada: boolean;
  fechaCompletada: string | null;
  completadaPor: number | null;
  orden: number;
  creadaPor: number;
  fechaCreacion: string;
  idMetaOrigen: number | null;
  trasladadaA: string | null; // AAAA-MM del mes al que se pasó esta meta pendiente
}

export interface EstadisticasMetas {
  porMes: { mes: string; total: number; completadas: number; trasladadas: number }[];
  porMiembro: { idUsuario: number; completadas: number }[];
}