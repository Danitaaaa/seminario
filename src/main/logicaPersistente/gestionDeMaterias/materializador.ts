import { Correlativa, Formacion, MateriaFormacion } from './entidades';

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
