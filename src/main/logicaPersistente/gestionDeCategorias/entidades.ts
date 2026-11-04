// Categoría de un evento. Personal (idProyecto null) o de un proyecto (usuarioId null).
export interface Categoria {
  id: number;
  idGlobal: string;
  usuarioId: number | null;
  idProyecto: number | null;
  nombre: string;
  // Solo cuando se listan las personales junto con las de mis proyectos (para filtrar en el front).
  nombreProyecto?: string | null;
}

// Categorías base de la aplicación: no se guardan por proyecto, el front las suma a las del proyecto.
export const CATEGORIAS_BASE = ['Clases', 'Parciales', 'Trabajos', 'Exámenes', 'Entregas', 'Otro'] as const;