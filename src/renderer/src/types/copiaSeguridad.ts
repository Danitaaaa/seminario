// Espejo de lo que devuelve el main (administracionDePersistencia/copiaSeguridad.ts).
export interface EstadoCopiaSeguridad {
  claveGuardada: boolean; // puede copiar sin pedir la contraseña
  puedeGuardarClave: boolean; // false en un Linux sin llavero
  automatica: boolean;
  ultima: { fecha: string; tamanio: number; lugar: 'drive' | 'archivo' } | null;
  variosUsuarios: boolean; // con más de un usuario en la compu no se puede copiar
}

export interface CopiaEnDrive {
  id: string;
  nombre: string;
  tamanio: number;
  fecha: string;
}

export type OrigenCopia = { drive: string } | { archivo: true };
