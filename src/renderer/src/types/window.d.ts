import { Archivo } from './archivo';
import { Nodo } from './nodo';
import type { Evento, CrearEventoInput, ListarEventosInput, ModificarEventoInput } from './eventos';
import type { Categoria, CrearCategoriaInput, ListarCategoriasInput, ModificarCategoriaInput } from './categorias';
import type { HorarioCursado, CrearHorarioInput, ListarHorariosInput, ModificarHorarioInput } from './horarios';
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
} from './proyectos';
import { Tarea } from './tareas';

// Los canales de edición compartida devuelven { ok, datos } o { ok: false, codigo, mensaje }
// (los errores personalizados pierden sus campos al cruzar IPC).
type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; codigo: string; mensaje: string; detalle?: Record<string, unknown> };

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

      // Gestion de eventos
      crearEvento: (datos: CrearEventoInput) => Promise<Evento>;
      listarEventos: (datos: ListarEventosInput) => Promise<Evento[]>;
      modificarEvento: (datos: ModificarEventoInput) => Promise<Evento>;
      eliminarEvento: (datos: { id: number; usuarioId: number }) => Promise<{ ok: boolean }>;

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
        idProyecto: number; idUsuarioSolicitante: number; mail: string; rol: 'editor' | 'lector';
      }) => Promise<{ pendiente: true; mail: string }>;
      cambiarRolMiembro: (datos: CambiarRolMiembroDatos) => Promise<Miembro>;

      listarInvitaciones: (datos: { idProyecto: number; idUsuarioSolicitante: number }) => Promise<InvitacionPendiente[]>;
      cancelarInvitacion: (datos: { idProyecto: number; idUsuarioSolicitante: number; idInvitacion: number }) => Promise<void>;
      // Gestion de tareas
      listarTareas: (datos: unknown) => Promise<Tarea[]>;
      crearTarea: (datos: unknown) => Promise<Tarea>;
      modificarTarea: (datos: unknown) => Promise<Tarea>;
      alternarTarea: (datos: unknown) => Promise<Tarea>;
      asignarTarea: (datos: unknown) => Promise<Tarea>;
      repartirTareas: (datos: unknown) => Promise<Tarea[]>;
      eliminarTarea: (datos: unknown) => Promise<{ ok: boolean }>;

      // Gestion de metas
      listarMetas: (datos: unknown) => Promise<unknown>;
      crearMeta: (datos: unknown) => Promise<unknown>;
      modificarMeta: (datos: unknown) => Promise<unknown>;
      alternarMeta: (datos: unknown) => Promise<unknown>;
      eliminarMeta: (datos: unknown) => Promise<{ ok: boolean }>;
      copiarMetas: (datos: unknown) => Promise<unknown>;
      estadisticasMetas: (datos: unknown) => Promise<unknown>;

      // Edicion compartida y sincronizacion
      iniciarEdicion: (clave: unknown) => Promise<Resultado<unknown>>;
      guardarEdicion: (clave: unknown) => Promise<Resultado<unknown>>;
      finalizarEdicion: (clave: unknown) => Promise<Resultado<void>>;
      consultarEdicion: (clave: unknown) => Promise<Resultado<unknown>>;
      listarConflictos: (datos: unknown) => Promise<Resultado<unknown>>;
      obtenerConflicto: (clave: unknown) => Promise<Resultado<unknown>>;
      resolverConflicto: (datos: unknown) => Promise<Resultado<{ version: number }>>;
      iniciarSincronizacion: (datos: { idUsuario: number; password?: string }) => Promise<Resultado<void>>;
      alEventoSincronizacion: (cb: (evento: unknown) => void) => () => void;
    };
  }
}

export {};