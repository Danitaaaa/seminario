export interface AporteIntegrante {
  idUsuario: number;
  nombre: string;
  hechas: number;
  pendientes: number;
}

export interface ResumenProyecto {
  idProyecto: number;
  nombre: string;
  tareas: { total: number; hechas: number; pendientes: number; vencidas: number; sinAsignar: number };
  metasMes: { total: number; completadas: number };
  integrantes: AporteIntegrante[];
  // Tareas completadas por mes (AAAA-MM), solo los meses con alguna.
  porMes: { mes: string; hechas: number }[];
}

export interface ResumenSesiones {
  sesiones: { completadas: number; atrasadas: number };
  minutos: { estudiados: number; planificados: number };
  objetivos: { total: number; completados: number };
  porMes: { mes: string; minutos: number }[];
  porMateria: { materia: string; minutos: number }[];
}

export interface ResumenMaterial {
  archivos: number;
  bytes: number;
  carpetas: number;
}
