import { Nota, ResumenCuaderno } from './entidades';

export function materializarNota(fila: any): Nota {
  return {
    idNota: fila.id_nota,
    idCuaderno: fila.id_cuaderno,
    tipo: fila.tipo,
    nombre: fila.nombre,
    fecha: fila.fecha ?? null, // ya viene como texto (to_char)
    nota: fila.nota === null ? null : Number(fila.nota), // NUMERIC llega como texto
    estado: fila.estado,
  };
}

export function materializarResumen(fila: any): ResumenCuaderno {
  return {
    idCuaderno: fila.id_cuaderno,
    nombre: fila.cuaderno,
    materia: {
      idMateria: fila.id_materia,
      nombre: fila.nombre,
      formacion: fila.formacion,
      anio: fila.anio ?? null,
      cuatrimestre: fila.cuatrimestre ?? null,
      estado: fila.estado,
    },
    archivos: fila.archivos,
    flashcards: fila.flashcards,
    notasTotal: fila.notas_total,
    notasCargadas: fila.notas_cargadas,
    proximo: fila.proximo_nombre ? { nombre: fila.proximo_nombre, fecha: fila.proximo_fecha } : null,
  };
}
