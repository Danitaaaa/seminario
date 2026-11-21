import { Archivo, AplicacionExterna } from './archivo';
import { Nodo, ResultadoImportacion } from './nodo';
import type { NotaRapida } from './notasRapidas';
import type { EstadoCalendarioGoogle } from './calendarioGoogle';
import type { Evento, CrearEventoInput, ListarEventosInput, ModificarEventoInput } from './eventos';
import type { Categoria, CrearCategoriaInput, ListarCategoriasInput, ModificarCategoriaInput } from './categorias';
import type { HorarioCursado, CrearHorarioInput, ListarHorariosInput, ModificarHorarioInput } from './horarios';
import type { Perfil } from './perfil';
import type {
  Meta, EstadisticasMetas, ListarMetasInput, CrearMetaInput, ModificarMetaInput, AlternarMetaInput,
  EliminarMetaInput, CopiarMetasInput, EstadisticasMetasInput,
} from './metas';
import type { PeriodoEstadisticas, ResumenCuestionarios, ResumenFlashcards, ResumenMaterial, ResumenProyecto, ResumenSesiones } from './estadisticas';
import type { Deck, Flashcard, FlashcardPendiente, RepeticionMaterial } from './flashcards';
import type { Notificacion } from './notificaciones';
import type {
  Proyecto,
  Miembro,
  CrearProyectoDatos,
  ModificarProyectoDatos,
  EliminarProyectoDatos,
  ObtenerProyectoDatos,
  ListarProyectosCriterios,
  AgregarMiembroDatos,
  QuitarMiembroDatos,
  ListarMiembrosCriterios,
  SincronizarProyectoDatos,
  UnirseAProyectoDatos,
  CambiarRolMiembroDatos,
  InvitacionPendiente,
  RolMiembro,
} from './proyectos';
import { Tarea } from './tareas';

// Los canales de edición compartida devuelven { ok, datos } o { ok: false, codigo, mensaje }
// (los errores personalizados pierden sus campos al cruzar IPC).
type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; codigo: string; mensaje: string; detalle?: Record<string, unknown> };
import type { SesionesEstudioApi } from './sesionesEstudio';
import type { SpotifyApi } from './spotify';
import type { MateriasApi } from './materias';
import type { CuadernosApi } from './cuadernos';
import type { MaterialIAApi } from './ia';
import type { ChatIAApi } from './chatIA';
// Flashcards con IA, guía de preguntas y plan de estudios con IA (src/preload/apis/materialIA.ts).
import type { MaterialIAExtraApi } from '../../../preload/apis/materialIA';

declare global {
  interface Window {
    api: SesionesEstudioApi & SpotifyApi & MateriasApi & CuadernosApi & MaterialIAApi & MaterialIAExtraApi & ChatIAApi & {
      // Gestion de material de estudio
      crearNodo: (datos: { nombre: string; idPadre: number | null }) => Promise<Nodo>;
      modificarNodo: (datos: { id: number; nombre: string; idMateria?: number | null }) => Promise<Nodo>;
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
      subirCarpeta: (datos: { idPadre: number }) => Promise<ResultadoImportacion | null>;
      importarRutas: (datos: { idPadre: number; rutas: string[] }) => Promise<ResultadoImportacion>;
      // null = el usuario canceló el diálogo. `destino` = nombre del archivo o de la carpeta donde quedó.
      descargarArchivos: (datos: { ids: number[] }) => Promise<{ copiados: number; fallidos: number; destino: string } | null>;
      crearDocumento: (datos: { idPadre: number; nombre: string; tipo: 'docx' | 'txt' }) => Promise<Archivo>;
      rutaDeArchivo: (archivo: File) => string;
      modificarArchivo: (datos: { id: number; nombre: string }) => Promise<Archivo>;
      eliminarArchivo: (datos: { id: number }) => Promise<void>;
      moverArchivos: (datos: { ids: number[]; idPadre: number }) => Promise<Archivo[]>;
      leerArchivo: (datos: { id: number }) => Promise<{ archivo: Archivo; contenido: Uint8Array }>;
      guardarArchivo: (datos: { id: number; contenido: Uint8Array }) => Promise<Archivo>;
      guardarDocx: (datos: { id: number; html: string }) => Promise<Archivo>;
      abrirExterno: (datos: { id: number }) => Promise<void>;
      abrirEnDrive: (datos: { id: number }) => Promise<void>;
      traerVersionDrive: (datos: { id: number }) => Promise<void>;
      cancelarDrive: () => Promise<void>;
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
      cerrarSesion: () => Promise<void>;
      obtenerIdGlobal: (idUsuario: number) => Promise<string | null>;

      // Gestion de perfil
      obtenerPerfil: (datos: { id: number }) => Promise<Perfil>;
      modificarPerfil: (datos: { id: number; nombre: string; apellido: string; email: string }) => Promise<Perfil>;
      cambiarPasswordActual: (datos: { id: number; passwordActual: string; passwordNueva: string }) => Promise<void>;
      eliminarUsuario: (datos: { id: number }) => Promise<void>;
      obtenerFotoPerfil: (datos: { id: number }) => Promise<string | null>;
      elegirFotoPerfil: (datos: { id: number }) => Promise<string | null>;
      elegirAvatar: (datos: { id: number; avatar: string }) => Promise<string>;
      elegirColorAvatar: (datos: { id: number; color: number | null }) => Promise<boolean>;
      verificarPassword: (datos: { id: number; password: string }) => Promise<void>;
      actualizarRostro: (datos: { id: number; password: string; embedding: number[] }) => Promise<{ exito: boolean; mensaje: string }>;

      // Gestion de eventos
      crearEvento: (datos: CrearEventoInput) => Promise<Evento>;
      listarEventos: (datos: ListarEventosInput) => Promise<Evento[]>;
      modificarEvento: (datos: ModificarEventoInput) => Promise<Evento>;
      eliminarEvento: (datos: { id: number; usuarioId: number }) => Promise<{ ok: boolean }>;

      // Gestion de categorias
      listarCategorias(d: { usuarioId: number; idProyecto?: number | null }): Promise<Categoria[]>;
      crearCategoria(d: { usuarioId: number; idProyecto?: number | null; nombre: string }): Promise<Categoria>;
      modificarCategoria(d: { usuarioId: number; id: number; nombre: string }): Promise<Categoria>;
      eliminarCategoria(d: { usuarioId: number; id: number }): Promise<{ ok: true }>;

      // Gestion de horarios
      crearHorario: (datos: CrearHorarioInput) => Promise<HorarioCursado>;
      listarHorarios: (datos: ListarHorariosInput) => Promise<HorarioCursado[]>;
      modificarHorario: (datos: ModificarHorarioInput) => Promise<HorarioCursado>;
      eliminarHorario: (datos: { id: number }) => Promise<{ ok: boolean }>;

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
      abrirEnlace: (datos: { enlace: 'github-dana' | 'correo' }) => Promise<void>;

      // Gestion de flashcards
      crearDeck: (datos: { usuarioId: number; nombre: string; descripcion?: string; materiaAsociada?: string }) => Promise<Deck>;
      listarDecks: (usuarioId: number) => Promise<Deck[]>;
      crearFlashcard: (datos: { usuarioId: number; deckId: number; pregunta: string; respuesta: string }) => Promise<Flashcard>;
      listarFlashcards: (datos: { usuarioId: number; deckId: number }) => Promise<Flashcard[]>;
      modificarFlashcard: (datos: { usuarioId: number; idFlashcard: number; pregunta: string; respuesta: string }) => Promise<Flashcard>;
      modificarDeck: (datos: { usuarioId: number; deckId: number; nombre: string }) => Promise<void>;
      eliminarDecks: (datos: { usuarioId: number; deckIds: number[] }) => Promise<number>;
      eliminarFlashcards: (datos: { usuarioId: number; deckId: number; flashcardIds: number[] }) => Promise<number>;
      listarFlashcardsPendientes: (usuarioId: number) => Promise<FlashcardPendiente[]>;
      registrarRevision: (datos: { usuarioId: number; flashcardId: number; dificultad: 'dificil' | 'intermedio' | 'facil' }) => Promise<FlashcardPendiente>;
      listarRepeticionesMaterial: (usuarioId: number) => Promise<RepeticionMaterial[]>;
      guardarRepeticionMaterial: (datos: { usuarioId: number; nodoId: number; intervaloDias: 1 | 3 | 7 | 14 }) => Promise<RepeticionMaterial>;

      // Gestion de proyectos
      crearProyecto: (datos: CrearProyectoDatos) => Promise<Proyecto>;
      modificarProyecto: (datos: ModificarProyectoDatos) => Promise<Proyecto>;
      eliminarProyecto: (datos: EliminarProyectoDatos) => Promise<void>;
      obtenerProyecto: (datos: ObtenerProyectoDatos) => Promise<Proyecto>;
      listarProyectos: (criterios: ListarProyectosCriterios) => Promise<Proyecto[]>;
      agregarMiembro: (datos: AgregarMiembroDatos) => Promise<Miembro>;
      quitarMiembro: (datos: QuitarMiembroDatos) => Promise<void>;
      listarMiembros: (criterios: ListarMiembrosCriterios) => Promise<Miembro[]>;
      sincronizarProyecto: (datos: SincronizarProyectoDatos) => Promise<void>;
      unirseAProyecto: (datos: UnirseAProyectoDatos) => Promise<Proyecto>;
      agregarMiembroPorMail: (datos: {
        idProyecto: number;
        idUsuarioSolicitante: number;
        mail: string;
        rol: 'editor' | 'lector';
        coloresCorreo?: {
          primario: string;
          fondo: string;
          superficie: string;
          borde: string;
          texto: string;
          suave: string;
        };
      }) => Promise<{ pendiente: true; mail: string }>;
      cambiarRolMiembro: (datos: CambiarRolMiembroDatos) => Promise<Miembro>;
      obtenerReglas: () => Promise<Record<string, readonly RolMiembro[]>>;

      listarInvitaciones: (datos: { idProyecto: number; idUsuarioSolicitante: number }) => Promise<InvitacionPendiente[]>;
      cancelarInvitacion: (datos: { idProyecto: number; idUsuarioSolicitante: number; idInvitacion: number }) => Promise<void>;

      // Estadisticas
      resumenProyectos: (datos: PeriodoEstadisticas & { mes: string; hoy: string }) => Promise<ResumenProyecto[]>;
      resumenMaterial: (datos: { idUsuario: number }) => Promise<ResumenMaterial>;
      resumenSesionesEstudio: (datos: PeriodoEstadisticas) => Promise<ResumenSesiones>;
      resumenCuestionarios: (datos: PeriodoEstadisticas) => Promise<ResumenCuestionarios>;
      resumenFlashcards: (datos: PeriodoEstadisticas) => Promise<ResumenFlashcards>;

      // Portada del proyecto
      obtenerPortadaProyecto: (datos: { idProyecto: number; idUsuario: number }) => Promise<string | null>;
      elegirPortadaProyecto: (datos: { idProyecto: number; idUsuario: number }) => Promise<string | null>;
      quitarPortadaProyecto: (datos: { idProyecto: number; idUsuario: number }) => Promise<void>;

      // Gestion de tareas
      listarTareas: (datos: unknown) => Promise<Tarea[]>;
      crearTarea: (datos: unknown) => Promise<Tarea>;
      modificarTarea: (datos: unknown) => Promise<Tarea>;
      alternarTarea: (datos: unknown) => Promise<Tarea>;
      asignarTarea: (datos: unknown) => Promise<Tarea>;
      repartirTareas: (datos: unknown) => Promise<Tarea[]>;
      eliminarTarea: (datos: unknown) => Promise<{ ok: boolean }>;

      // Gestion de metas (personales y de proyectos)
      listarMetas: (datos: ListarMetasInput) => Promise<Meta[]>;
      crearMeta: (datos: CrearMetaInput) => Promise<Meta>;
      modificarMeta: (datos: ModificarMetaInput) => Promise<Meta>;
      alternarMeta: (datos: AlternarMetaInput) => Promise<Meta>;
      eliminarMeta: (datos: EliminarMetaInput) => Promise<{ ok: boolean }>;
      copiarMetas: (datos: CopiarMetasInput) => Promise<Meta[]>;
      estadisticasMetas: (datos: EstadisticasMetasInput) => Promise<EstadisticasMetas>;

      // Edicion compartida y sincronizacion
      iniciarEdicion: (clave: unknown) => Promise<Resultado<unknown>>;
      guardarEdicion: (clave: unknown) => Promise<Resultado<unknown>>;
      finalizarEdicion: (clave: unknown) => Promise<Resultado<void>>;
      consultarEdicion: (clave: unknown) => Promise<Resultado<unknown>>;
      listarConflictos: (datos: unknown) => Promise<Resultado<unknown>>;
      obtenerConflicto: (clave: unknown) => Promise<Resultado<unknown>>;
      resolverConflicto: (datos: unknown) => Promise<Resultado<{ version: number }>>;
      claveEdicion: (datos: { entidad: 'archivo' | 'evento' | 'meta'; id: number }) => Promise<Resultado<{ idProyecto: number; idGlobal: string } | null>>;
      iniciarSincronizacion: (datos: { idUsuario: number; password?: string }) => Promise<Resultado<void>>;
      alEventoSincronizacion: (cb: (evento: unknown) => void) => () => void;
      // Modo voz
      lectorPantallaActivo: () => Promise<boolean>;
      alCambiarLector: (escuchar: (activo: boolean) => void) => () => void;
      // Dictado (Whisper en la compu)
      dictadoListo: () => Promise<boolean>;
      prepararDictado: () => Promise<boolean>;
      alProgresoDictado: (escuchar: (avance: number) => void) => () => void;
      // Bienestar (avisos si planificás o estudiás demasiado)
      bienestarActivo: (datos: { usuarioId: number }) => Promise<boolean>;

      // Notas rápidas (post-its) de una carpeta
      listarNotasRapidas: (datos: { usuarioId: number; idNodo: number }) => Promise<NotaRapida[]>;
      crearNotaRapida: (datos: { usuarioId: number; idNodo: number; texto: string; color?: number }) => Promise<NotaRapida>;
      modificarNotaRapida: (datos: { usuarioId: number; idNota: number; texto?: string; color?: number; posX?: number; posY?: number }) => Promise<NotaRapida>;
      eliminarNotaRapida: (datos: { usuarioId: number; idNota: number }) => Promise<void>;

      // Google Calendar (copia de Syntra hacia Google)
      estadoCalendarioGoogle: () => Promise<EstadoCalendarioGoogle>;
      conectarCalendarioGoogle: () => Promise<EstadoCalendarioGoogle>;
      sincronizarCalendarioGoogle: () => Promise<EstadoCalendarioGoogle>;
      desconectarCalendarioGoogle: () => Promise<EstadoCalendarioGoogle>;
      cancelarCalendarioGoogle: () => Promise<void>;
      cambiarBienestar: (datos: { usuarioId: number; activo: boolean }) => Promise<boolean>;
    };
  }
}

export {};