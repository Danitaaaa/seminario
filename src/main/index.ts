import 'dotenv/config';
import { app, BrowserWindow, net, protocol, shell } from 'electron';
import { isAbsolute, join, relative, resolve } from 'path';
import { pathToFileURL } from 'url';
import { is } from '@electron-toolkit/utils';

import { pool, verifyDbConnection } from './persistencia/baseDeDatos';
import { Persistencia } from './persistencia/persistencia';

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


let mainWindow: BrowserWindow | null = null;

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

  // Enlaces externos
  registerEnlacesIpc();
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
  } catch (err) {
    console.error('[startup] No se pudo conectar a Postgres:', err);
  }

  wireDependencies();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', async () => {
  await pool.end();
  if (process.platform !== 'darwin') app.quit();
});