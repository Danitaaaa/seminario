export interface Categoria {
  id: number;
  usuarioId: number;
  nombre: string;
}

export interface CrearCategoriaInput {
  usuarioId: number;
  nombre: string;
}

export interface ModificarCategoriaInput {
  id: number;
  nombre: string;
}

export interface ListarCategoriasInput {
  usuarioId: number;
}
