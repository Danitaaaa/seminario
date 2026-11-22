import { Correlativa, CuatrimestreCursada, Formacion, MateriaFormacion } from './entidades';

export function materializarFormacion(fila: any): Formacion {
  return {
    idFormacion: fila.id_formacion,
    idUsuario: fila.id_usuario,
    tipo: fila.tipo,
    nombre: fila.nombre,
    institucion: fila.institucion ?? null,
    duracionAnios: fila.duracion_anios === null ? null : Number(fila.duracion_anios), // NUMERIC llega como texto
    organizacion: fila.organizacion,
    anioActual: fila.anio_actual ?? null,
    cuatrimestreActual: fila.cuatrimestre_actual ?? null,
  };
}

export function materializarMateria(fila: any): MateriaFormacion {
  return {
    idMateria: fila.id_materia,
    idFormacion: fila.id_formacion,
    nombre: fila.nombre,
    anio: fila.anio ?? null,
    cuatrimestre: fila.cuatrimestre ?? null,
    estado: fila.estado,
  };
}

export function materializarCorrelativa(fila: any): Correlativa {
  return { idMateria: fila.id_materia, idRequisito: fila.id_requisito };
}

export function nombreCuatrimestre(tipo: 'primero' | 'segundo', anio: number): string {
  return `${tipo === 'primero' ? '1°' : '2°'} cuatrimestre ${anio}`;
}

export function materializarCuatrimestre(fila: any): CuatrimestreCursada {
  return {
    idCuatrimestre: fila.id_cuatrimestre,
    anio: fila.anio,
    tipo: fila.tipo,
    nombre: nombreCuatrimestre(fila.tipo, fila.anio),
    fechaInicio: fila.fecha_inicio, // ya viene como texto (to_char)
    fechaFin: fila.fecha_fin,
    recesos: (fila.recesos ?? []).map((r: any) => ({ desde: r.desde, hasta: r.hasta, descripcion: r.descripcion ?? null })),
    horarios: fila.horarios ?? 0,
    cuadernos: fila.cuadernos ?? 0,
  };
}
