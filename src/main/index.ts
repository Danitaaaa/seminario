import 'dotenv/config';
import { app, BrowserWindow, net, Notification, protocol, shell } from 'electron';
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
import { Almacenamiento } from './persistencia/almacenamiento';
import path from 'path';

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

// Gestion de horarios
import { CrearHorario } from './logicaPersistente/gestionDeHorarios/crearHorario';
import { ListarHorarios } from './logicaPersistente/gestionDeHorarios/listarHorarios';
import { ModificarHorario } from './logicaPersistente/gestionDeHorarios/modificarHorario';
import { EliminarHorario } from './logicaPersistente/gestionDeHorarios/eliminarHorario';
import { Horarios } from './administracionDePersistencia/horarios';
import { registerHorariosIpc } from './ipc/horarios.ipc';

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
import { SesionesEstudio } from './administracionDePersistencia/sesionesEstudio';
import { ProcesoSesionEstudio } from './logicaNoPersistente/procesoSesionEstudio/procesoSesionEstudio';
import { DocumentoSesionEstudio } from './logicaNoPersistente/procesoSesionEstudio/documentoSesionEstudio';
import { registerSesionesEstudioIpc } from './ipc/sesionesEstudio.ipc';
import { ImportarContenidoDesdeMaterial } from './logicaPersistente/gestionDeSesionEstudio/importarContenidoDesdeMaterial';

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
  const archivos = new Archivos(crearArchivo, buscarArchivos, modificarArchivo, eliminarArchivo, moverArchivos,
    obtenerArchivo, actualizarContenidoArchivo);
 

  // Gestion de usuarios
  const iniciarSesion = new IniciarSesion(persistencia);
  const registrarUsuario = new RegistrarUsuario(persistencia);
  const verificarMail = new VerificarMail(persistencia);
  const recuperarPassword = new RecuperarPassword(persistencia);
  const validarCodigo = new ValidarCodigo(persistencia);
  const cambiarPassword = new CambiarPassword(persistencia);
  const usuarios = new Usuarios(iniciarSesion, registrarUsuario, verificarMail, recuperarPassword, validarCodigo, cambiarPassword);
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

  // Gestion de sesion de estudio (el contenido se guarda en la base y en material)
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
  const proceso = new ProcesoSesionEstudio(sesionesEstudio, (canal, datos) =>
    mainWindow?.webContents.send(canal, datos)
  );
  registerSesionesEstudioIpc(sesionesEstudio, proceso);

  // notificacion del sistema cuando termina una fase del pomodoro
  proceso.on('faseCambio', (_terminada: string, nueva: string) => {
    if (!Notification.isSupported()) return;
    const cuerpo = nueva === 'pomodoro'
      ? 'Terminó el descanso. ¡A enfocarse de nuevo!'
      : nueva === 'descanso_largo'
        ? '¡Bien! Completaste 4 pomodoros: tomate un descanso largo.'
        : 'Terminó el pomodoro: tomate un descanso corto.';
    new Notification({ title: 'Pomodoro', body: cuerpo }).show();
  });

  // Spotify
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

  procesoSesion = wireDependencies();
  createWindow();
  await procesoSesion.arrancar();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', async () => {
  procesoSesion?.detener();
  await pool.end();
  if (process.platform !== 'darwin') app.quit();
});