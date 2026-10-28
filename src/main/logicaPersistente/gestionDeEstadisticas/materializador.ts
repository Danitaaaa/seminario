import { AporteIntegrante, ResumenProyecto, ResumenSesiones } from './entidades';

export function materializarAporte(fila: any): AporteIntegrante {
  return {
    idUsuario: fila.id_usuario,
    nombre: fila.nombre,
    hechas: fila.hechas,
    pendientes: fila.pendientes,
  };
}

export function materializarResumenProyecto(fila: any, integrantes: AporteIntegrante[]): ResumenProyecto {
  return {
    idProyecto: fila.id_proyecto,
    nombre: fila.nombre,
    tareas: {
      total: fila.total,
      hechas: fila.hechas,
      pendientes: fila.pendientes,
      vencidas: fila.vencidas,
      sinAsignar: fila.sin_asignar,
    },
    metasMes: { total: fila.metas_total, completadas: fila.metas_completadas },
    integrantes,
  };
}

export function materializarResumenSesiones(
  totales: any,
  objetivos: any,
  porMes: any[],
  porMateria: any[]
): ResumenSesiones {
  return {
    sesiones: { completadas: totales.completadas, atrasadas: totales.atrasadas },
    minutos: { estudiados: totales.minutos_estudiados, planificados: totales.minutos_planificados },
    objetivos: { total: objetivos.total, completados: objetivos.completados },
    porMes: porMes.map((f) => ({ mes: f.mes, minutos: f.minutos })),
    porMateria: porMateria.map((f) => ({ materia: f.materia, minutos: f.minutos })),
  };
}