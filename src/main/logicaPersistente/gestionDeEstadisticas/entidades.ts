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