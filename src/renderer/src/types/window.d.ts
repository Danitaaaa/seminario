import type { Evento, CrearEventoInput, ListarEventosInput, ModificarEventoInput } from './eventos';

declare global {
  interface Window {
    api: {
      //obtenerSaludo: () => Promise<Saludo | null>;
      // agregar aquí cada función que se exponga en preload/index.ts
    crearEvento: (datos: import('./eventos').CrearEventoInput) => Promise<import('./eventos').Evento>;
    listarEventos: (datos: import('./eventos').ListarEventosInput) => Promise<import('./eventos').Evento[]>;
    modificarEvento: (datos: import('./eventos').ModificarEventoInput) => Promise<import('./eventos').Evento>;
    eliminarEvento: (datos: { id: number }) => Promise<{ ok: boolean }>;
    

    crearCategoria: (datos: import('./categorias').CrearCategoriaInput) => Promise<import('./categorias').Categoria>;
    listarCategorias: (datos: import('./categorias').ListarCategoriasInput) => Promise<import('./categorias').Categoria[]>;
    modificarCategoria: (datos: import('./categorias').ModificarCategoriaInput) => Promise<import('./categorias').Categoria>;
    eliminarCategoria: (datos: { id: number }) => Promise<{ ok: boolean }>;

    };
  }
}
