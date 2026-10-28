import {
  Materia,
  ObjetivoSesion,
  PestanaSesion,
  SesionEstudio,
  TipoMetodoEstudio,
} from './entidades';

// Convierte una fila de la consulta base (snake_case) en una SesionEstudio (camelCase).
export function materializarSesionEstudio(fila: any): SesionEstudio {
  const idSesion: number = fila.id_sesion_estudio;
  return {
    idSesion,
    idUsuario: fila.id_usuario,
    nombre: fila.nombre,
    duracion: fila.duracion,
    materiaAsociada: { idMateria: fila.id_materia, nombre: fila.materia_nombre },
    metodosEstudio: fila.metodos_estudio as TipoMetodoEstudio[],
    estado: fila.estado,
    fechaCreacion: fila.fecha_creacion,
    fechaProgramada: fila.fecha_programada,
    fechaUltimoAcceso: fila.fecha_ultimo_acceso,
    fechaInicio: fila.fecha_inicio,
    fechaFin: fila.fecha_fin,
    pausada: fila.fecha_pausa !== null && fila.fecha_pausa !== undefined,
    fechaPausa: fila.fecha_pausa ?? null,
    segundosPausados: fila.segundos_pausados ?? 0,
    pomodoroMin: fila.pomodoro_min,
    descansoCortoMin: fila.descanso_corto_min,
    descansoLargoMin: fila.descanso_largo_min,
    pomodoro: {
      fase: fila.pomodoro_fase ?? 'pomodoro',
      restanteSeg: fila.pomodoro_restante_seg ?? null,
      corriendoDesde: fila.pomodoro_corriendo_desde ?? null,
      completados: fila.pomodoros_completados ?? 0,
    },
    recibirNotificacion: fila.recibir_notificacion,
    contenido: fila.contenido ?? '',
    idArchivo: fila.id_archivo ?? null,
    idDeck: fila.id_deck ?? null,
    metas: (fila.metas as any[]).map((o) => materializarObjetivo(o, idSesion)),
  };
}

// Convierte un meta armado por json_build_object en un ObjetivoSesion.
export function materializarObjetivo(fila: any, idSesion: number): ObjetivoSesion {
  return {
    idObjetivo: fila.idObjetivo,
    idSesion,
    descripcion: fila.descripcion,
    completado: fila.completado,
    orden: fila.orden,
  };
}

// Convierte una fila de pestana_sesion en una PestanaSesion.
export function materializarPestana(fila: any): PestanaSesion {
  return {
    idPestana: fila.id_pestana,
    idSesion: fila.id_sesion_estudio,
    titulo: fila.titulo,
    contenido: fila.contenido ?? '',
    orden: fila.orden,
    fechaModificacion: fila.fecha_modificacion,
  };
}

// Convierte una fila de la tabla materia en una Materia.
export function materializarMateria(fila: any): Materia {
  return { idMateria: fila.id_materia, nombre: fila.nombre };
}

// Convierte una fila de tipo_metodo_estudio en un TipoMetodoEstudio.
export function materializarTipoMetodoEstudio(fila: any): TipoMetodoEstudio {
  return { idTipoMetodoEstudio: fila.id_tipo_metodo_estudio, nombre: fila.nombre };
}
