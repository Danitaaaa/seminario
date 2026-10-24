export interface Meta {
  id: number;
  usuarioId: number;
  titulo: string;
  // AAAA-MM-DD o null
  fechaLimite: string | null;
  completada: boolean;
  fechaCreacion: string;
}

export interface CrearMetaInput {
  usuarioId: number;
  titulo: string;
  fechaLimite?: string | null;
}

export interface CompletarMetaInput {
  id: number;
  usuarioId: number;
  completada: boolean;
}

export interface EliminarMetaInput {
  id: number;
  usuarioId: number;
}