import { Archivo, AplicacionExterna } from './archivo';
import { Nodo } from './nodo';
import type { Evento, CrearEventoInput, ListarEventosInput, ModificarEventoInput } from './eventos';
import type { Categoria, CrearCategoriaInput, ListarCategoriasInput, ModificarCategoriaInput } from './categorias';
import type { HorarioCursado, CrearHorarioInput, ListarHorariosInput, ModificarHorarioInput } from './horarios';
import type { Perfil } from './perfil';
import type { Meta, CrearMetaInput, CompletarMetaInput, EliminarMetaInput } from './metas';
import type { Deck, Flashcard, FlashcardPendiente, RepeticionMaterial } from './flashcards';
import type { Notificacion } from './notificaciones';

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
      abrirEnDrive: (datos: { id: number }) => Promise<void>;
      traerVersionDrive: (datos: { id: number }) => Promise<void>;
      aplicacionesDisponibles: (datos: { id: number }) => Promise<AplicacionExterna[]>;
      abrirConAplicacion: (datos: { id: number; aplicacionId: string }) => Promise<void>;
      elegirAplicacion: (datos: { id: number }) => Promise<void>;

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
      verificarPassword: (datos: { id: number; password: string }) => Promise<void>;
      actualizarRostro: (datos: { id: number; password: string; embedding: number[] }) => Promise<{ exito: boolean; mensaje: string }>;

      // Gestion de eventos
      crearEvento: (datos: CrearEventoInput) => Promise<Evento>;
      listarEventos: (datos: ListarEventosInput) => Promise<Evento[]>;
      modificarEvento: (datos: ModificarEventoInput) => Promise<Evento>;
      eliminarEvento: (datos: { id: number }) => Promise<{ ok: boolean }>;

      // Gestion de categorias
      crearCategoria: (datos: CrearCategoriaInput) => Promise<Categoria>;
      listarCategorias: (datos: ListarCategoriasInput) => Promise<Categoria[]>;
      modificarCategoria: (datos: ModificarCategoriaInput) => Promise<Categoria>;
      eliminarCategoria: (datos: { id: number }) => Promise<{ ok: boolean }>;

      // Gestion de horarios
      crearHorario: (datos: CrearHorarioInput) => Promise<HorarioCursado>;
      listarHorarios: (datos: ListarHorariosInput) => Promise<HorarioCursado[]>;
      modificarHorario: (datos: ModificarHorarioInput) => Promise<HorarioCursado>;
      eliminarHorario: (datos: { id: number }) => Promise<{ ok: boolean }>;

      // Gestion de metas
      listarMetas: (datos: { usuarioId: number }) => Promise<Meta[]>;
      crearMeta: (datos: CrearMetaInput) => Promise<Meta>;
      completarMeta: (datos: CompletarMetaInput) => Promise<Meta>;
      eliminarMeta: (datos: EliminarMetaInput) => Promise<void>;

      // Pantalla de inicio
      obtenerFondoInicio: (datos: { id: number }) => Promise<string | null>;
      elegirFondoInicio: (datos: { id: number }) => Promise<string | null>;

      // Notificaciones
      listarNotificaciones: (datos: { usuarioId: number }) => Promise<Notificacion[]>;
      marcarNotificacionesLeidas: (datos: { usuarioId: number; ids?: number[] }) => Promise<void>;
      borrarNotificacionesLeidas: (datos: { usuarioId: number }) => Promise<void>;
      obtenerSilencioNotificaciones: (datos: { usuarioId: number }) => Promise<boolean>;
      silenciarNotificaciones: (datos: { usuarioId: number; silenciadas: boolean }) => Promise<boolean>;
      vigilarNotificaciones: (datos: { usuarioId: number }) => Promise<void>;
      detenerNotificaciones: () => Promise<void>;
      alLlegarNotificacion: (escuchar: () => void) => () => void;
      alTocarNotificacion: (escuchar: () => void) => () => void;
      alSonarNotificacion: (escuchar: () => void) => () => void;

      // Enlaces externos
      abrirEnlace: (datos: { enlace: 'github-dana' }) => Promise<void>;

      // Gestion de flashcards
      crearDeck: (datos: { usuarioId: number; nombre: string; descripcion?: string; materiaAsociada?: string }) => Promise<Deck>;
      listarDecks: (usuarioId: number) => Promise<Deck[]>;
      crearFlashcard: (datos: { usuarioId: number; deckId: number; pregunta: string; respuesta: string }) => Promise<Flashcard>;
      listarFlashcards: (datos: { usuarioId: number; deckId: number }) => Promise<Flashcard[]>;
      listarFlashcardsPendientes: (usuarioId: number) => Promise<FlashcardPendiente[]>;
      registrarRevision: (datos: { usuarioId: number; flashcardId: number; dificultad: 'dificil' | 'intermedio' | 'facil' }) => Promise<FlashcardPendiente>;
      listarRepeticionesMaterial: (usuarioId: number) => Promise<RepeticionMaterial[]>;
      guardarRepeticionMaterial: (datos: { usuarioId: number; nodoId: number; intervaloDias: 1 | 3 | 7 | 14 }) => Promise<RepeticionMaterial>;
    };
  }
}

export {};