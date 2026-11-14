// Cuánto aportó cada integrante a las tareas de un proyecto.
export interface AporteIntegrante {
  idUsuario: number;
  nombre: string;
  hechas: number;
  pendientes: number;
}

// Resumen de un proyecto para la pantalla de Estadísticas.
export interface ResumenProyecto {
  idProyecto: number;
  nombre: string;
  tareas: {
    total: number;
    hechas: number;
    pendientes: number;
    vencidas: number;
    sinAsignar: number;
  };
  // Metas del proyecto en el mes pedido.
  metasMes: { total: number; completadas: number };
  integrantes: AporteIntegrante[];
  // Tareas completadas en cada mes del período pedido (solo los meses con alguna).
  porMes: TareasMes[];
}

// Tareas completadas en un mes (AAAA-MM).
export interface TareasMes {
  mes: string;
  hechas: number;
}

// Minutos estudiados en un mes (AAAA-MM).
export interface MinutosMes {
  mes: string;
  minutos: number;
}

// Minutos estudiados en una materia.
export interface MinutosMateria {
  materia: string;
  minutos: number;
}

// Resumen de las sesiones de estudio del usuario en el período pedido.
export interface ResumenSesiones {
  // Sesiones que ya tendrían que haberse hecho: completadas + atrasadas.
  sesiones: { completadas: number; atrasadas: number };
  // Minutos realmente estudiados (sin las pausas) y los que se habían planificado en esas sesiones.
  minutos: { estudiados: number; planificados: number };
  objetivos: { total: number; completados: number };
  porMes: MinutosMes[];
  porMateria: MinutosMateria[];
}

// Resumen de Material (solo lo personal: no cuenta las carpetas de los proyectos).
export interface ResumenMaterial {
  archivos: number;
  bytes: number;
  carpetas: number;
}

// Resumen de los cuestionarios con IA que resolvió el usuario en el período pedido.
export interface ResumenCuestionarios {
  intentos: number; // veces que resolvió un cuestionario
  cuestionarios: number; // cuestionarios distintos
  correctas: number;
  preguntas: number;
  // % de aciertos de cada mes (AAAA-MM), solo los meses con algún intento.
  porMes: { mes: string; porcentaje: number; intentos: number }[];
  // Temas en los que más se equivocó, de mayor a menor.
  temas: { tema: string; errores: number; total: number }[];
  // Los últimos cuestionarios que resolvió, con su último resultado y el mejor.
  recientes: { idMaterialIA: number; titulo: string; ultimo: number; mejor: number; intentos: number }[];
}

// Resumen de los repasos de flashcards del usuario en el período pedido.
export interface ResumenFlashcards {
  repasos: number; // tarjetas repasadas (cada vez cuenta)
  tarjetas: number; // tarjetas distintas
  mazos: number;
  faciles: number;
  dificiles: number;
  porMes: { mes: string; repasos: number }[];
  porMazo: { idDeck: number; nombre: string; repasos: number }[];
}
