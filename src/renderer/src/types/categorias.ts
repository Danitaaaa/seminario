// Categoría de un evento: personal (idProyecto null) o de un proyecto (usuarioId null).
export interface Categoria {
  id: number;
  idGlobal: string;
  usuarioId: number | null;
  idProyecto: number | null;
  nombre: string;
  // Solo al listar sin proyecto: nombre del proyecto al que pertenece (para agrupar/filtrar).
  nombreProyecto?: string | null;
}

// usuarioId = quien opera. idProyecto ausente = categoría personal.
export interface CrearCategoriaInput {
  usuarioId: number;
  idProyecto?: number | null;
  nombre: string;
}

export interface ModificarCategoriaInput {
  usuarioId: number;
  id: number;
  nombre: string;
}

export interface EliminarCategoriaInput {
  usuarioId: number;
  id: number;
}

// Con idProyecto: solo las de ese proyecto. Sin idProyecto: las personales + las de mis proyectos.
export interface ListarCategoriasInput {
  usuarioId: number;
  idProyecto?: number | null;
}