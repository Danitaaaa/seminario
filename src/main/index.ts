import 'dotenv/config';
import { app, BrowserWindow, dialog, net, Notification, protocol, shell } from 'electron';
import { isAbsolute, join, relative, resolve } from 'path';
import { pathToFileURL } from 'url';
import { is } from '@electron-toolkit/utils';

import { pool, verifyDbConnection } from './persistencia/baseDeDatos';
import { Persistencia } from './persistencia/Persistencia';

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

// Gestion de metas
import { CrearMeta } from './logicaPersistente/gestionDeMetas/crearMeta';
import { ListarMetas } from './logicaPersistente/gestionDeMetas/listarMetas';
import { CompletarMeta } from './logicaPersistente/gestionDeMetas/completarMeta';
import { EliminarMeta } from './logicaPersistente/gestionDeMetas/eliminarMeta';
import { Metas } from './administracionDePersistencia/metas';
import { registerMetasIpc } from './ipc/metas.ipc';

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

let mainWindow: BrowserWindow | null = null;

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

function wireDependencies(): void {
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
  registerArchivosIpc(archivos, almacenamiento);

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
  registerDriveIpc(driveServicio);

  // Gestion de usuarios
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
  registerUsuariosIpc(usuarios);

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
    new CrearMeta(persistencia), new ListarMetas(persistencia),
    new CompletarMeta(persistencia), new EliminarMeta(persistencia)
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
      metas: (usuarioId) => metas.listar({ usuarioId }),
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

  wireDependencies();
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', async () => {
  await pool.end();
  if (process.platform !== 'darwin') app.quit();
});