// Cuánto tiene el usuario en un día: lo que planificó y lo que ya estudió.
export interface CargaDelDia {
  sesiones: number; // sesiones programadas para ese día
  minutosPlanificados: number;
  minutosEstudiados: number; // de las sesiones terminadas o en curso, sin las pausas
}
