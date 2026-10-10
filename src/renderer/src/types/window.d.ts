import { Archivo } from './archivo';
import { Nodo } from './nodo';
import type { Evento, CrearEventoInput, ListarEventosInput, ModificarEventoInput } from './eventos';
import type { Categoria, CrearCategoriaInput, ListarCategoriasInput, ModificarCategoriaInput } from './categorias';
import type { Perfil } from './perfil';

declare global {
  interface Window {
    api: {
      // Gestion de material de estudio
      crearNodo: (datos: { nombre: string; idPadre: number | null }) => Promise<Nodo>;
      modificarNodo: (datos: { id: number; nombre: string }) => Promise<Nodo>;
      moverNodo: (datos: { id: number; idNuevoPadre: number | null }) => Promise<Nodo>;
      listarContenido: (criterios: unknown) => Promise<Nodo[]>;
      eliminarNodo: (datos: { id: number }) => Promise<void>;
      crearArchivo: (datos: {
        nombre: string;
        extension: string;
        rutaFisica: string;
        tamanio: number;
        idPadre: number;
      }) => Promise<Archivo>;
      seleccionarArchivo: () => Promise<{
        nombre: string;
        extension: string;
        rutaFisica: string;
        tamanio: number;
      } | null>;
      modificarArchivo: (datos: { id: number; nombre: string }) => Promise<Archivo>;
      eliminarArchivo: (datos: { id: number }) => Promise<void>;
      moverArchivos: (datos: { ids: number[]; idPadre: number }) => Promise<Archivo[]>;
      leerArchivo: (datos: { id: number }) => Promise<{ archivo: Archivo; contenido: Uint8Array }>;
      guardarArchivo: (datos: { id: number; contenido: Uint8Array }) => Promise<Archivo>;
      guardarDocx: (datos: { id: number; html: string }) => Promise<Archivo>;
      abrirExterno: (datos: { id: number }) => Promise<void>;

      // Gestion de usuarios
      iniciarSesion: (datos: { email: string; password: string }) => Promise<{ id: number }>;
      registrarUsuario: (datos: {
        nombre: string;
        apellido: string;
        apodo: string;
        email: string;
        fechaNacimiento: Date;
        password: string;
        confirmPassword: string;
      }) => Promise<{ id: number }>;
      verificarMail: (datos: { email: string; codigo: string }) => Promise<void>;
      recuperarPassword: (datos: { email: string }) => Promise<void>;
      validarCodigo: (datos: { email: string; codigo: string }) => Promise<void>;
      cambiarPassword: (datos: { email: string; nuevaPassword: string }) => Promise<void>;
      registrarRostro: (usuarioId: number, embedding: number[]) => Promise<{ exito: boolean; mensaje: string }>;
      loginFacial: (embedding: number[]) => Promise<
        | { exito: true; usuarioId: number }
        | { exito: false; mensaje: string }
      >;

      // Gestion de perfil
      obtenerPerfil: (datos: { id: number }) => Promise<Perfil>;
      modificarPerfil: (datos: { id: number; nombre: string; apellido: string; email: string }) => Promise<Perfil>;
      cambiarPasswordActual: (datos: { id: number; passwordActual: string; passwordNueva: string }) => Promise<void>;
      eliminarUsuario: (datos: { id: number }) => Promise<void>;
      obtenerFotoPerfil: (datos: { id: number }) => Promise<string | null>;
      elegirFotoPerfil: (datos: { id: number }) => Promise<string | null>;   


      crearEvento: (datos: CrearEventoInput) => Promise<Evento>;
      listarEventos: (datos: ListarEventosInput) => Promise<Evento[]>;
      modificarEvento: (datos: ModificarEventoInput) => Promise<Evento>;
      eliminarEvento: (datos: { id: number }) => Promise<{ ok: boolean }>;

      // Gestion de categorias
      crearCategoria: (datos: CrearCategoriaInput) => Promise<Categoria>;
      listarCategorias: (datos: ListarCategoriasInput) => Promise<Categoria[]>;
      modificarCategoria: (datos: ModificarCategoriaInput) => Promise<Categoria>;
      eliminarCategoria: (datos: { id: number }) => Promise<{ ok: boolean }>;
    };
  }
}

export {};