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

export interface ResumenCuestionarios {
  intentos: number;
  cuestionarios: number;
  correctas: number;
  preguntas: number;
  porMes: { mes: string; porcentaje: number; intentos: number }[];
  temas: { tema: string; errores: number; total: number }[];
  recientes: { idMaterialIA: number; titulo: string; ultimo: number; mejor: number; intentos: number }[];
}

export interface ResumenFlashcards {
  repasos: number;
  tarjetas: number;
  mazos: number;
  faciles: number;
  dificiles: number;
  porMes: { mes: string; repasos: number }[];
  porMazo: { idDeck: number; nombre: string; repasos: number }[];
}

// Desde qué día se cuenta y cómo se agrupan los gráficos (por día o por mes).
export interface PeriodoEstadisticas {
  idUsuario: number;
  desde: string;
  desfaseMinutos: number;
  agrupar: 'dia' | 'mes';
}
