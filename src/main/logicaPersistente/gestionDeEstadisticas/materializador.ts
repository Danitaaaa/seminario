import { AporteIntegrante, ResumenCuestionarios, ResumenFlashcards, ResumenMaterial, ResumenProyecto, ResumenSesiones, TareasMes } from './entidades';

export function materializarAporte(fila: any): AporteIntegrante {
  return {
    idUsuario: fila.id_usuario,
    nombre: fila.nombre,
    hechas: fila.hechas,
    pendientes: fila.pendientes,
  };
}

export function materializarTareasMes(fila: any): TareasMes {
  return { mes: fila.mes, hechas: fila.hechas };
}

export function materializarResumenProyecto(fila: any, integrantes: AporteIntegrante[], porMes: TareasMes[]): ResumenProyecto {
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
    porMes,
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

export function materializarResumenMaterial(fila: any): ResumenMaterial {
  return {
    archivos: fila.archivos,
    // SUM de un BIGINT llega como texto desde pg.
    bytes: Number(fila.bytes),
    carpetas: fila.carpetas,
  };
}

export function materializarResumenCuestionarios(totales: any, porMes: any[], temas: any[], recientes: any[]): ResumenCuestionarios {
  return {
    intentos: totales.intentos,
    cuestionarios: totales.cuestionarios,
    correctas: totales.correctas,
    preguntas: totales.preguntas,
    porMes: porMes.map((f) => ({ mes: f.mes, porcentaje: f.porcentaje, intentos: f.intentos })),
    temas: temas.map((f) => ({ tema: f.tema, errores: f.errores, total: f.total })),
    recientes: recientes.map((f) => ({
      idMaterialIA: f.id_material_ia,
      titulo: f.titulo,
      ultimo: f.ultimo,
      mejor: f.mejor,
      intentos: f.intentos,
    })),
  };
}

export function materializarResumenFlashcards(totales: any, porMes: any[], porMazo: any[]): ResumenFlashcards {
  return {
    repasos: totales.repasos,
    tarjetas: totales.tarjetas,
    mazos: totales.mazos,
    faciles: totales.faciles,
    dificiles: totales.dificiles,
    porMes: porMes.map((f) => ({ mes: f.mes, repasos: f.repasos })),
    porMazo: porMazo.map((f) => ({ idDeck: f.id_deck, nombre: f.nombre, repasos: f.repasos })),
  };
}
