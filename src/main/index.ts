import 'dotenv/config';
import { app, BrowserWindow, dialog, net, Notification, protocol, shell } from 'electron';
import { isAbsolute, join, relative, resolve } from 'path';
import { pathToFileURL } from 'url';
import { is } from '@electron-toolkit/utils';

import { pool, verifyDbConnection } from './persistencia/baseDeDatos';
import { Persistencia } from './persistencia/persistencia';

// ---------------------------------------------------------------------------
// userData por instancia: DEBE hacerse antes de cualquier otra cosa que use
// app.getPath('userData') (id-cliente-sync.txt, sync-secretos.json, etc.).
// ---------------------------------------------------------------------------
const dirDatos = process.env.ELECTRON_USER_DATA_DIR;
if (dirDatos) {
  app.setPath('userData', resolve(dirDatos));
} else if (process.env.INSTANCIA) {
  app.setPath('userData', join(app.getPath('appData'), `${app.getName()}-${process.env.INSTANCIA}`));
}
console.log('[startup] userData =', app.getPath('userData'));

// Gestion de material de estudio
import { CrearNodo } from './logicaPersistente/gestionMaterialEstudio/crearNodo';
import { ModificarNodo } from './logicaPersistente/gestionMaterialEstudio/modificarNodo';
import { BuscarNodos } from './logicaPersistente/gestionMaterialEstudio/buscarNodos';
import { EliminarNodo } from './logicaPersistente/gestionMaterialEstudio/eliminarNodo';
import { MoverNodo } from './logicaPersistente/gestionMaterialEstudio/moverNodo';
import { Nodos } from './administracionDePersistencia/nodo';
import { registrarNodosIpc } from './ipc/nodo.ipc';
import { ListarContenido } from './logicaPersistente/gestionMaterialEstudio/listarContenido';
import { CrearArchivo } from './logicaPersistente/gestionMaterialEstudio/crearArchivo';
import { Archivos } from './administracionDePersistencia/archivos';
import { registerArchivosIpc } from './ipc/archivos.ipc';
import { ModificarArchivo } from './logicaPersistente/gestionMaterialEstudio/modificarArchivo';
import { EliminarArchivo } from './logicaPersistente/gestionMaterialEstudio/eliminarArchivo';
import { MoverArchivos } from './logicaPersistente/gestionMaterialEstudio/moverArchivos';
import { BuscarArchivos } from './logicaPersistente/gestionMaterialEstudio/buscarArchivos';
import { ObtenerArchivo } from './logicaPersistente/gestionMaterialEstudio/obtenerArchivo';
import { ActualizarContenidoArchivo } from './logicaPersistente/gestionMaterialEstudio/actualizarContenidoArchivo';
import { GuardarDriveId } from './logicaPersistente/gestionMaterialEstudio/guardarDriveId';
import { Almacenamiento } from './persistencia/almacenamiento';
import path from 'path';

// Google Drive
import { AlmacenTokensDrive } from './logicaNoPersistente/drive/almacenTokensDrive';
import { cifradorElectron } from './logicaNoPersistente/drive/cifradorElectron';
import { OAuthDrive } from './logicaNoPersistente/drive/oauthDrive';
import { DriveCliente } from './logicaNoPersistente/drive/driveCliente';
import { DriveServicio } from './logicaNoPersistente/drive/driveServicio';
import { registerDriveIpc } from './ipc/drive.ipc';

// Gestion de usuarios
import { IniciarSesion } from './logicaPersistente/gestionDeUsuarios/iniciarSesion';
import { RegistrarUsuario } from './logicaPersistente/gestionDeUsuarios/registrarUsuario';
import { VerificarMail } from './logicaPersistente/gestionDeUsuarios/verificarMail';
import { RecuperarPassword } from './logicaPersistente/gestionDeUsuarios/recuperarPassword';
import { Usuarios } from './administracionDePersistencia/usuarios';
import { registerUsuariosIpc } from './ipc/usuarios.ipc';
import { CambiarPassword } from './logicaPersistente/gestionDeUsuarios/cambiarPassword';
import { ValidarCodigo } from './logicaPersistente/gestionDeUsuarios/validarCodigo';

// Gestion de eventos
import { CrearEvento } from './logicaPersistente/gestionDeEventos/crearEvento';
import { ListarEventos } from './logicaPersistente/gestionDeEventos/listarEventos';
import { ModificarEvento } from './logicaPersistente/gestionDeEventos/modificarEvento';
import { EliminarEvento } from './logicaPersistente/gestionDeEventos/eliminarEvento';
import { Eventos } from './administracionDePersistencia/eventos';
import { registerEventosIpc } from './ipc/eventos.ipc';

// Gestion de categorias
import { CrearCategoria } from './logicaPersistente/gestionDeCategorias/crearCategoria';
import { ListarCategorias } from './logicaPersistente/gestionDeCategorias/listarCategorias';
import { ModificarCategoria } from './logicaPersistente/gestionDeCategorias/modificarCategoria';
import { EliminarCategoria } from './logicaPersistente/gestionDeCategorias/eliminarCategoria';
import { Categorias } from './administracionDePersistencia/categorias';
import { registerCategoriasIpc } from './ipc/categorias.ipc';
import { ObtenerPerfil } from './logicaPersistente/gestionDeUsuarios/obtenerPerfil';
import { ModificarPerfil } from './logicaPersistente/gestionDeUsuarios/modificarPerfil';
import { CambiarPasswordActual } from './logicaPersistente/gestionDeUsuarios/cambiarPasswordActual';
import { EliminarUsuario } from './logicaPersistente/gestionDeUsuarios/eliminarUsuario';
import { ActualizarFotoPerfil, ObtenerFotoPerfil } from './logicaPersistente/gestionDeUsuarios/fotoPerfil';

// Gestion de horarios
import { CrearHorario } from './logicaPersistente/gestionDeHorarios/crearHorario';
import { ListarHorarios } from './logicaPersistente/gestionDeHorarios/listarHorarios';
import { ModificarHorario } from './logicaPersistente/gestionDeHorarios/modificarHorario';
import { EliminarHorario } from './logicaPersistente/gestionDeHorarios/eliminarHorario';
import { Horarios } from './administracionDePersistencia/horarios';
import { registerHorariosIpc } from './ipc/horarios.ipc';
import { registerEnlacesIpc } from './ipc/enlaces.ipc';
import { VerificarPassword } from './logicaPersistente/gestionDeUsuarios/verificarPassword';
import { ActualizarRostro } from './logicaPersistente/gestionDeUsuarios/actualizarRostro';

// Pantalla de inicio
import { ObtenerFondoInicio, ActualizarFondoInicio } from './logicaPersistente/gestionDeInicio/fondoInicio';
import { Inicio } from './administracionDePersistencia/inicio';
import { registerInicioIpc } from './ipc/inicio.ipc';

// Gestion de flashcards
import { CrearDeck } from './logicaPersistente/gestionDeFlashcards/crearDeck';
import { ListarDecks } from './logicaPersistente/gestionDeFlashcards/listarDecks';
import { CrearFlashcard } from './logicaPersistente/gestionDeFlashcards/crearFlashcard';
import { ListarFlashcards } from './logicaPersistente/gestionDeFlashcards/listarFlashcards';
import { Flashcards } from './administracionDePersistencia/flashcards';
import { registerFlashcardsIpc } from './ipc/flashcards.ipc';
import { RegistrarRevision } from './logicaPersistente/gestionDeRepeticionEspaciada/registrarRevision';
import { ListarFlashcardsPendientes } from './logicaPersistente/gestionDeRepeticionEspaciada/listarFlashcardsPendientes';
import { ListarRepeticionesMaterial } from './logicaPersistente/gestionDeRepeticionEspaciada/listarRepeticionesMaterial';
import { GuardarRepeticionMaterial } from './logicaPersistente/gestionDeRepeticionEspaciada/guardarRepeticionMaterial';
import { RepeticionEspaciada } from './administracionDePersistencia/repeticionEspaciada';
import { registerRepeticionEspaciadaIpc } from './ipc/repeticionEspaciada.ipc';
import { EnviarRecordatoriosPendientes } from './logicaPersistente/gestionDeRepeticionEspaciada/enviarRecordatoriosPendientes';

// Notificaciones
import { CrearNotificacion } from './logicaPersistente/gestionDeNotificaciones/crearNotificacion';
import { ListarNotificaciones } from './logicaPersistente/gestionDeNotificaciones/listarNotificaciones';
import { MarcarLeidas } from './logicaPersistente/gestionDeNotificaciones/marcarLeidas';
import { BorrarLeidas } from './logicaPersistente/gestionDeNotificaciones/borrarLeidas';
import { ObtenerSilencio, CambiarSilencio } from './logicaPersistente/gestionDeNotificaciones/silencio';
import type { Notificacion } from './logicaPersistente/gestionDeNotificaciones/entidades';
import { Notificaciones } from './administracionDePersistencia/notificaciones';
import { Notificador } from './logicaNoPersistente/notificaciones/notificador';
import { VigiaNotificaciones } from './logicaNoPersistente/notificaciones/vigiaNotificaciones';
import { registerNotificacionesIpc } from './ipc/notificaciones.ipc';

// Gestion de proyectos
import { CrearProyecto } from './logicaPersistente/gestionDeProyectos/crearProyecto';
import { ModificarProyecto } from './logicaPersistente/gestionDeProyectos/modificarProyecto';
import { EliminarProyecto } from './logicaPersistente/gestionDeProyectos/eliminarProyecto';
import { ObtenerProyecto } from './logicaPersistente/gestionDeProyectos/obtenerProyecto';
import { ListarProyectos } from './logicaPersistente/gestionDeProyectos/listarProyectos';
import { ListarMiembros } from './logicaPersistente/gestionDeProyectos/listarMiembros';
import { AgregarMiembroPorMail } from './logicaPersistente/gestionDeProyectos/agregarMiembroPorMail';
import { AgregarMiembro } from './logicaPersistente/gestionDeProyectos/agregarMiembro';
import { CambiarRolMiembro } from './logicaPersistente/gestionDeProyectos/cambiarRolMiembro';
import { Proyectos } from './administracionDePersistencia/proyectos';
import { registrarProyectosIpc } from './ipc/proyectos.ipc';
import { ListarInvitaciones } from './logicaPersistente/gestionDeProyectos/listarInvitaciones';
import { CancelarInvitacion } from './logicaPersistente/gestionDeProyectos/cancelarInvitacion';
import {
  ObtenerPortadaProyecto,
  ActualizarPortadaProyecto,
  QuitarPortadaProyecto,
} from './logicaPersistente/gestionDeProyectos/portadaProyecto';
import { PortadasProyectos } from './administracionDePersistencia/portadasProyectos';
import { registerPortadasProyectosIpc } from './ipc/portadasProyectos.ipc';

// Estadísticas
import { ResumenProyectos } from './logicaPersistente/gestionDeEstadisticas/resumenProyectos';
import { ResumenSesionesEstudio } from './logicaPersistente/gestionDeEstadisticas/resumenSesiones';
import { Estadisticas } from './administracionDePersistencia/estadisticas';
import { registerEstadisticasIpc } from './ipc/estadisticas.ipc';
// Gestion de edicion compartida y sincronizacion
import {
  componerSincronizacion,
  crearProveedorIdentidad,
} from './logicaPersistente/gestionDeProyectos/componerSincronizacion';
import type { RegistroManejadores } from './logicaPersistente/gestionDeProyectos/edicionCompartida';
import {
  ManejadorEvento,
  ManejadorMeta,
  ManejadorTarea,
} from './logicaPersistente/gestionDeProyectos/manejadoresEntidades';
import { ManejadorNodo, ManejadorArchivo } from './logicaPersistente/gestionDeProyectos/manejadoresContenido';
import { Edicion } from './administracionDePersistencia/edicion';
import { registerEdicionIpc } from './ipc/edicion.ipc'; // ajustá si tu archivo se llama distinto
import {
  fijarSesionSync,
  limpiarSesionSync,
  usuarioSesionSync,
} from './sesionSync';

// Gestion de metas
import { Metas } from './administracionDePersistencia/metas';
import { CrearMeta } from './logicaPersistente/gestionDeMetas/crearMeta';
import { registerMetasIpc } from './ipc/metas.ipc';
import { AlternarMeta } from './logicaPersistente/gestionDeMetas/alternarMeta';
import { CopiarMetas } from './logicaPersistente/gestionDeMetas/copiarMetas';
import { EliminarMeta } from './logicaPersistente/gestionDeMetas/eliminarMeta';
import { EstadisticasMetasProyecto } from './logicaPersistente/gestionDeMetas/estadisticasMetas';
import { ListarMetas } from './logicaPersistente/gestionDeMetas/listarMetas';
import { ModificarMeta } from './logicaPersistente/gestionDeMetas/modificarMeta';

// Gestion de tareas
import { Tareas } from './administracionDePersistencia/tareas';
import { CrearTarea } from './logicaPersistente/gestionDeTareas/crearTarea';
import { ListarTareas } from './logicaPersistente/gestionDeTareas/listarTareas';
import { ModificarTarea } from './logicaPersistente/gestionDeTareas/modificarTarea';
import { AlternarTarea } from './logicaPersistente/gestionDeTareas/alternarTarea';
import { AsignarTarea } from './logicaPersistente/gestionDeTareas/asignarTarea';
import { RepartirTareas } from './logicaPersistente/gestionDeTareas/repartirTareas';
import { EliminarTarea } from './logicaPersistente/gestionDeTareas/eliminarTarea';
import { registerTareasIpc } from './ipc/tareas.ipc';

// Gestion de sesion de estudio
import { CrearSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/crearSesionEstudio';
import { ListarSesionesEstudio } from './logicaPersistente/gestionDeSesionEstudio/listarSesionesEstudio';
import { ObtenerSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/obtenerSesionEstudio';
import { ModificarSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/modificarSesionEstudio';
import { IniciarSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/iniciarSesionEstudio';
import { PausarSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/pausarSesionEstudio';
import { ReanudarSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/reanudarSesionEstudio';
import { FinalizarSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/finalizarSesionEstudio';
import { EliminarSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/eliminarSesionEstudio';
import { GestionarObjetivos } from './logicaPersistente/gestionDeSesionEstudio/gestionarObjetivos';
import { GestionarPestanas } from './logicaPersistente/gestionDeSesionEstudio/gestionarPestanas';
import { GestionarPomodoro } from './logicaPersistente/gestionDeSesionEstudio/gestionarPomodoro';
import { ListarOpcionesSesionEstudio } from './logicaPersistente/gestionDeSesionEstudio/listarOpcionesSesionEstudio';
import { GestionarMaterias } from './logicaPersistente/gestionDeSesionEstudio/gestionarMaterias';
import { BuscarSesionesSuperpuestas } from './logicaPersistente/gestionDeSesionEstudio/buscarSesionesSuperpuestas';
import { ObtenerResumenSesiones } from './logicaPersistente/gestionDeSesionEstudio/obtenerResumenSesiones';
import { VerificarSesionesEstudioAtrasadas } from './logicaPersistente/gestionDeSesionEstudio/verificarSesionesEstudioAtrasadas';
import { RecuperarSesionInterrumpida } from './logicaPersistente/gestionDeSesionEstudio/recuperarSesionInterrumpida';
import { ObtenerSesionEnCurso } from './logicaPersistente/gestionDeSesionEstudio/obtenerSesionEnCurso';
import { RegistrarLatidoSesion } from './logicaPersistente/gestionDeSesionEstudio/registrarLatidoSesion';
import { GuardarContenidoSesion } from './logicaPersistente/gestionDeSesionEstudio/guardarContenidoSesion';
import { ImportarContenidoDesdeMaterial } from './logicaPersistente/gestionDeSesionEstudio/importarContenidoDesdeMaterial';
import { SesionesEstudio } from './administracionDePersistencia/sesionesEstudio';
import { ProcesoSesionEstudio } from './logicaNoPersistente/procesoSesionEstudio/procesoSesionEstudio';
import { DocumentoSesionEstudio } from './logicaNoPersistente/procesoSesionEstudio/documentoSesionEstudio';
import { registerSesionesEstudioIpc } from './ipc/sesionesEstudio.ipc';

// Spotify
import { GuardarCuentaSpotify } from './logicaPersistente/gestionDeSpotify/guardarCuentaSpotify';
import { ObtenerCuentaSpotify } from './logicaPersistente/gestionDeSpotify/obtenerCuentaSpotify';
import { EliminarCuentaSpotify } from './logicaPersistente/gestionDeSpotify/eliminarCuentaSpotify';
import { CuentasSpotify } from './administracionDePersistencia/spotify';
import { AutenticacionSpotify } from './logicaNoPersistente/spotify/autenticacionSpotify';
import { ClienteSpotify } from './logicaNoPersistente/spotify/clienteSpotify';
import { registerSpotifyIpc } from './ipc/spotify.ipc';

let mainWindow: BrowserWindow | null = null;
let procesoSesion: ProcesoSesionEstudio | null = null;

// Se guardan mientras están en pantalla: si no, Windows puede perder el clic.
const avisosVisibles = new Set<Notification>();

// Muestra el aviso en las notificaciones de la compu. Al tocarlo se abre Syntra con la campanita.
function mostrarEnSistema(notificacion: Notificacion): void {
  if (!Notification.isSupported()) return;
  // Sin sonido de Windows: el sonido lo pone la app, así suena aunque Windows tenga los avisos sin sonido.
  const aviso = new Notification({ title: notificacion.titulo, body: notificacion.mensaje, silent: true });
  avisosVisibles.add(aviso);
  aviso.on('close', () => avisosVisibles.delete(aviso));
  aviso.on('click', () => {
    avisosVisibles.delete(aviso);
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('notificaciones:abrir');
  });
  aviso.show();
  mainWindow?.webContents.send('notificaciones:sonar');
}

// Se guarda para poder liberar los bloqueos de edición al cerrar la app.
let edicion: Edicion | null = null;
let cerrando = false;

// Raíz global bajo la que cuelgan los proyectos (según el comentario de DepsSincronizacion: hoy 2).
const ID_NODO_PADRE_PROYECTOS = 2;

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'modelos',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);


function wireDependencies(): ProcesoSesionEstudio {
  const persistencia = new Persistencia(pool);

  // Gestion de material de estudio
  const crearNodo = new CrearNodo(persistencia);
  const modificarNodo = new ModificarNodo(persistencia);
  const buscarNodos = new BuscarNodos(persistencia);
  const buscarArchivos = new BuscarArchivos(persistencia);
  const listarContenido = new ListarContenido(buscarNodos, buscarArchivos);
  const moverNodo = new MoverNodo(persistencia);
  const eliminarNodo = new EliminarNodo(persistencia);
  const nodos = new Nodos(crearNodo, modificarNodo, listarContenido, eliminarNodo, moverNodo);
  registrarNodosIpc(nodos);

  const almacenamiento = new Almacenamiento(path.join(app.getPath('userData'), 'archivos'));
  const crearArchivo = new CrearArchivo(persistencia, almacenamiento);
  const modificarArchivo = new ModificarArchivo(persistencia);
  const eliminarArchivo = new EliminarArchivo(persistencia, almacenamiento);
  const moverArchivos = new MoverArchivos(persistencia);
  const obtenerArchivo = new ObtenerArchivo(persistencia);
  const actualizarContenidoArchivo = new ActualizarContenidoArchivo(persistencia, almacenamiento);
  const guardarDriveId = new GuardarDriveId(persistencia);
  const archivos = new Archivos(crearArchivo, buscarArchivos, modificarArchivo, eliminarArchivo, moverArchivos,
    obtenerArchivo, actualizarContenidoArchivo, guardarDriveId);


  // Google Drive
  const almacenTokens = new AlmacenTokensDrive(path.join(app.getPath('userData'), 'drive-token.bin'), cifradorElectron);
  const oauth = new OAuthDrive(
    { clientId: process.env.GOOGLE_CLIENT_ID ?? '', clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '' },
    almacenTokens,
    (url) => shell.openExternal(url),
  );
  const driveServicio = new DriveServicio(
    new DriveCliente(() => oauth.obtenerAccessToken()),
    archivos,
    almacenamiento,
    (url) => shell.openExternal(url),
  );
  

  // Gestion de usuarios (el IPC se registra más abajo, cuando existe la sincronización)
  const iniciarSesion = new IniciarSesion(persistencia);
  const registrarUsuario = new RegistrarUsuario(persistencia);
  const verificarMail = new VerificarMail(persistencia);
  const recuperarPassword = new RecuperarPassword(persistencia);
  const validarCodigo = new ValidarCodigo(persistencia);
  const cambiarPassword = new CambiarPassword(persistencia);
  const verificarPassword = new VerificarPassword(persistencia);
  const usuarios = new Usuarios(
    iniciarSesion, registrarUsuario, verificarMail, recuperarPassword, validarCodigo, cambiarPassword,
    new ObtenerPerfil(persistencia), new ModificarPerfil(persistencia),
    new CambiarPasswordActual(verificarPassword, persistencia), new EliminarUsuario(persistencia),
    new ObtenerFotoPerfil(persistencia),
    new ActualizarFotoPerfil(persistencia, path.join(app.getPath('userData'), 'fotosPerfil')),
    verificarPassword, new ActualizarRostro(verificarPassword)
  );

  // Gestion de eventos
  const crearEvento = new CrearEvento(persistencia);
  const listarEventos = new ListarEventos(persistencia);
  const modificarEvento = new ModificarEvento(persistencia);
  const eliminarEvento = new EliminarEvento(persistencia);
  const eventos = new Eventos(crearEvento, listarEventos, modificarEvento, eliminarEvento);
  registerEventosIpc(eventos);

  // Gestion de categorias
  const categorias = new Categorias(
    new CrearCategoria(persistencia), new ListarCategorias(persistencia),
    new ModificarCategoria(persistencia), new EliminarCategoria(persistencia)
  );
  registerCategoriasIpc(categorias);

  // Gestion de horarios
  const horarios = new Horarios(
    new CrearHorario(persistencia), new ListarHorarios(persistencia),
    new ModificarHorario(persistencia), new EliminarHorario(persistencia)
  );
  registerHorariosIpc(horarios);

  // Gestion de metas
  const metas = new Metas(
    new CrearMeta(persistencia),
    new ListarMetas(persistencia),
    new ModificarMeta(persistencia),
    new AlternarMeta(persistencia),
    new EliminarMeta(persistencia),
    new CopiarMetas(persistencia),
    new EstadisticasMetasProyecto(persistencia),
  );
  registerMetasIpc(metas);

  // Pantalla de inicio
  const inicio = new Inicio(
    new ObtenerFondoInicio(persistencia),
    new ActualizarFondoInicio(persistencia, path.join(app.getPath('userData'), 'fondosInicio'))
  );
  registerInicioIpc(inicio);

  // Notificaciones
  const notificaciones = new Notificaciones(
    new CrearNotificacion(persistencia), new ListarNotificaciones(persistencia),
    new MarcarLeidas(persistencia), new ObtenerSilencio(persistencia), new CambiarSilencio(persistencia),
    new BorrarLeidas(persistencia)
  );
  const notificador = new Notificador(
    notificaciones, mostrarEnSistema, () => mainWindow?.webContents.send('notificaciones:nuevas')
  );
  const vigia = new VigiaNotificaciones(
    {
      eventos: (usuarioId, desde) => eventos.listar({ usuarioId, desde }),
      metas: (usuarioId, dia) => metas.listar({ idUsuario: usuarioId, desde: dia, hasta: dia }),
    },
    notificador
  );
  registerNotificacionesIpc(notificaciones, vigia);

  // Enlaces externos
  registerEnlacesIpc();

  // Gestion de flashcards
  const flashcards = new Flashcards(
    new CrearDeck(persistencia),
    new ListarDecks(persistencia),
    new CrearFlashcard(persistencia),
    new ListarFlashcards(persistencia)
  );
  registerFlashcardsIpc(flashcards);

  const repeticionEspaciada = new RepeticionEspaciada(
    new ListarFlashcardsPendientes(persistencia),
    new RegistrarRevision(persistencia),
    new ListarRepeticionesMaterial(persistencia),
    new GuardarRepeticionMaterial(persistencia)
  );
  registerRepeticionEspaciadaIpc(repeticionEspaciada);

  // Sincronizacion y edicion compartida
  const identidad = crearProveedorIdentidad(
    async () => {
      const idUsuario = usuarioSesionSync();
      if (idUsuario === null) throw new Error('No hay sesión iniciada para sincronizar.');

      const f = await persistencia.ejecutar<{ email: string; nombre: string; apodo: string | null }>(
        `SELECT email, nombre, apodo FROM usuarios WHERE id_usuario = $1`,
        [idUsuario],
      );
      if (!f[0]) throw new Error(`Usuario ${idUsuario} inexistente`);
      return { mail: f[0].email, nombre: f[0].apodo?.trim() || f[0].nombre };
    },
  );

  // Un manejador por entidad: aplican en la BD local los cambios que llegan de otros miembros.
  // Sin manejador, un cambio remoto se descarta y la versión igual avanza (se pierde para siempre).
  const manejadores: RegistroManejadores = {
    nodo: new ManejadorNodo(persistencia),
    archivo: new ManejadorArchivo(persistencia, almacenamiento),
    evento: new ManejadorEvento(persistencia, usuarioSesionSync),
    meta: new ManejadorMeta(persistencia, usuarioSesionSync),
    tarea: new ManejadorTarea(persistencia, usuarioSesionSync),
  };

  const sync = componerSincronizacion({
    persistencia,
    crearNodo,
    manejadores,
    identidad,
    mailDe: async (idUsuario: number) => {
      const f = await persistencia.ejecutar<{ email: string }>(
        `SELECT email FROM usuarios WHERE id_usuario = $1`,
        [idUsuario],
      );
      if (!f[0]) throw new Error(`Usuario ${idUsuario} inexistente`);
      return f[0].email;
    },
    emitir: (e) => mainWindow?.webContents.send('sincronizacion:evento', e),
    idNodoPadreProyectos: ID_NODO_PADRE_PROYECTOS,
  });

  // IPC de usuarios: ahora que existe la sincronización, el login la arranca y el logout la detiene.
  registerUsuariosIpc(usuarios, {
    alIniciarSesion: (idUsuario, password) => {
      console.log('[sync] hook de login, usuario:', idUsuario);
      fijarSesionSync(idUsuario, password);
      void sync.coordinador.iniciar(idUsuario)
        .then(() => console.log('[sync] coordinador iniciado'))
        .catch((e) => console.warn('[sync] no pudo iniciar:', e));
    },
    alCerrarSesion: async () => {
      await sync.coordinador.detener();
      limpiarSesionSync();
    },
  });

  // Gestion de proyectos (usa las piezas reales de la sincronización, sin mock)
  const agregarMiembro = new AgregarMiembro(persistencia, sync.sync);
  const listarInvitaciones = new ListarInvitaciones(persistencia);
  const agregarMiembroPorMail = new AgregarMiembroPorMail(persistencia, sync.sync);
  const cancelarInvitacion = new CancelarInvitacion(persistencia, sync.sync);
  void agregarMiembro;

  const proyectos = new Proyectos(
    new CrearProyecto(persistencia, crearNodo),
    new ModificarProyecto(persistencia, modificarNodo),
    new EliminarProyecto(persistencia, sync.sync, (id) => sync.coordinador.dejarDeVigilar(id)),
    new ObtenerProyecto(persistencia),
    new ListarProyectos(persistencia),
    sync.agregarMiembro,
    sync.quitarMiembro,
    new ListarMiembros(persistencia, sync.sync),
    sync.sincronizarProyecto,
    agregarMiembroPorMail,
    new CambiarRolMiembro(persistencia, sync.sync),
    listarInvitaciones,
    cancelarInvitacion,
  );
  registrarProyectosIpc(proyectos);

  // Portadas de los proyectos (locales de cada compu)
  const portadas = new PortadasProyectos(
    new ObtenerPortadaProyecto(persistencia),
    new ActualizarPortadaProyecto(persistencia, path.join(app.getPath('userData'), 'portadasProyectos')),
    new QuitarPortadaProyecto(persistencia)
  );
  registerPortadasProyectosIpc(portadas);

  // Estadísticas
  registerEstadisticasIpc(new Estadisticas(new ResumenProyectos(persistencia), new ResumenSesionesEstudio(persistencia)));

  // Gestion de edicion y conflictos
  edicion = new Edicion(sync.edicion, sync.coordinador, sync.unirseAProyecto);
  registerEdicionIpc(edicion);

  // Gestion de tareas
  const tareas = new Tareas(
    new CrearTarea(persistencia),
    new ListarTareas(persistencia),
    new ModificarTarea(persistencia),
    new AlternarTarea(persistencia),
    new AsignarTarea(persistencia),
    new RepartirTareas(persistencia),
    new EliminarTarea(persistencia),
  );
  registerTareasIpc(tareas);

  // Gestion de sesion de estudio (el contenido se guarda en la base y en su Word de Material)
  const documentoSesion = new DocumentoSesionEstudio(archivos, nodos, persistencia);
  const sesionesEstudio = new SesionesEstudio({
    crear: new CrearSesionEstudio(persistencia, documentoSesion),
    listar: new ListarSesionesEstudio(persistencia),
    obtener: new ObtenerSesionEstudio(persistencia),
    modificar: new ModificarSesionEstudio(persistencia),
    iniciar: new IniciarSesionEstudio(persistencia),
    pausar: new PausarSesionEstudio(persistencia),
    reanudar: new ReanudarSesionEstudio(persistencia),
    finalizar: new FinalizarSesionEstudio(persistencia),
    eliminar: new EliminarSesionEstudio(persistencia),
    metas: new GestionarObjetivos(persistencia),
    pestanas: new GestionarPestanas(persistencia),
    pomodoro: new GestionarPomodoro(persistencia),
    opciones: new ListarOpcionesSesionEstudio(persistencia),
    materias: new GestionarMaterias(persistencia),
    superpuestas: new BuscarSesionesSuperpuestas(persistencia),
    resumen: new ObtenerResumenSesiones(persistencia),
    verificarAtrasadas: new VerificarSesionesEstudioAtrasadas(persistencia),
    recuperarInterrumpida: new RecuperarSesionInterrumpida(persistencia),
    enCurso: new ObtenerSesionEnCurso(persistencia),
    latido: new RegistrarLatidoSesion(persistencia),
    guardarContenido: new GuardarContenidoSesion(persistencia, documentoSesion),
    importarDesdeMaterial: new ImportarContenidoDesdeMaterial(persistencia),
  });
  // Se registra acá porque al guardar un Word desde Material avisa a Sesión de estudio.
  registerArchivosIpc(archivos, almacenamiento, (idArchivo, html) =>
    sesionesEstudio.importarDesdeMaterial(idArchivo, html)
  );
  // Lo mismo al traer la versión de Google Drive: si es el Word de una sesión, la sesión se actualiza.
  registerDriveIpc(driveServicio, async (idArchivo) => {
    const archivo = await archivos.obtener({ id: idArchivo });
    if (archivo.extension.toLowerCase() !== 'docx') return;
    const html = await documentoSesion.leerHtml(almacenamiento.rutaCompleta(archivo.rutaFisica));
    await sesionesEstudio.importarDesdeMaterial(idArchivo, html);
  });
  const proceso = new ProcesoSesionEstudio(sesionesEstudio, (canal, datos) =>
    mainWindow?.webContents.send(canal, datos)
  );
  registerSesionesEstudioIpc(sesionesEstudio, proceso);

  // Aviso del sistema cuando termina una fase del Pomodoro (aunque la app esté minimizada).
  proceso.on('faseCambio', (_terminada: string, nueva: string) => {
    if (!Notification.isSupported()) return;
    const cuerpo = nueva === 'pomodoro'
      ? 'Terminó el descanso. ¡A enfocarse de nuevo!'
      : nueva === 'descanso_largo'
        ? '¡Bien! Completaste 4 pomodoros: tomate un descanso largo.'
        : 'Terminó el pomodoro: tomate un descanso corto.';
    new Notification({ title: 'Pomodoro', body: cuerpo }).show();
  });

  // Spotify (solo control remoto de la reproducción)
  const configSpotify = {
    clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
    puerto: Number(process.env.SPOTIFY_PUERTO_REDIRECCION) || 8888,
  };
  const cuentasSpotify = new CuentasSpotify(
    new GuardarCuentaSpotify(persistencia),
    new ObtenerCuentaSpotify(persistencia),
    new EliminarCuentaSpotify(persistencia)
  );
  const clienteSpotify = new ClienteSpotify(
    cuentasSpotify,
    configSpotify,
    new AutenticacionSpotify(configSpotify, (url) => shell.openExternal(url))
  );
  registerSpotifyIpc(clienteSpotify);

  return proceso;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Para que el sonido de los avisos pueda reproducirse sin que se haya hecho clic.
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

}

app.whenReady().then(async () => {
  // Windows necesita este nombre para mostrar las notificaciones de la app.
  if (process.platform === 'win32') app.setAppUserModelId(is.dev ? process.execPath : 'com.syntra.app');

  const carpetaModelos = resolve(__dirname, '../renderer/models');
  protocol.handle('modelos', (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'local') return new Response('', { status: 403 });

    let archivo: string;
    try {
      archivo = decodeURIComponent(url.pathname);
    } catch {
      return new Response('', { status: 400 });
    }

    const ruta = resolve(carpetaModelos, `.${archivo}`);
    const rutaRelativa = relative(carpetaModelos, ruta);
    if (rutaRelativa.startsWith('..') || isAbsolute(rutaRelativa)) {
      return new Response('', { status: 403 });
    }

    return net.fetch(pathToFileURL(ruta).toString());
  });

  try {
    await verifyDbConnection();
  } catch (error) {
    console.error('[startup] No se pudo preparar la base de datos:', error);
    dialog.showErrorBox(
      'No se pudo preparar la base de datos',
      'Revisá la conexión y el esquema de PostgreSQL y volvé a abrir la aplicación.'
    );
    app.quit();
    return;
  }

  // Los handlers IPC se registran antes de crear la ventana.
  procesoSesion = wireDependencies();
  const recordatorios = new EnviarRecordatoriosPendientes(new Persistencia(pool));
  let recordatoriosEnCurso = false;
  const enviarRecordatorios = async () => {
    if (recordatoriosEnCurso) return;
    recordatoriosEnCurso = true;
    try {
      await recordatorios.ejecutar();
    } catch (error) {
      console.error('[repeticion-espaciada] No se pudieron enviar los recordatorios pendientes.', error);
    } finally {
      recordatoriosEnCurso = false;
    }
  };
  void enviarRecordatorios();
  setInterval(() => void enviarRecordatorios(), 15 * 60 * 1000);
  createWindow();
  await procesoSesion.arrancar();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((err) => {
  console.error('[startup] Falló el arranque:', err);
  app.quit();
});

app.on('window-all-closed', () => {
  // El pool se cierra en before-quit, después de liberar los bloqueos de edición.
  procesoSesion?.detener();
  if (process.platform !== 'darwin') app.quit();
});

// Cierre ordenado: libera los bloqueos de edición y recién después cierra el pool.
app.on('before-quit', (event) => {
  if (cerrando) return;
  event.preventDefault();
  cerrando = true;

  void (async () => {
    try {
      await edicion?.cerrarTodas();
    } catch (err) {
      console.error('[shutdown] No se pudieron liberar los bloqueos:', err);
    }
    try {
      await pool.end();
    } catch (err) {
      console.error('[shutdown] Error al cerrar el pool:', err);
    }
    app.quit();
  })();
});