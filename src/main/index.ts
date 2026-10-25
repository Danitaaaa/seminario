import 'dotenv/config';
import { app, BrowserWindow, dialog, net, protocol } from 'electron';
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
  const archivos = new Archivos(crearArchivo, buscarArchivos, modificarArchivo, eliminarArchivo, moverArchivos,
    obtenerArchivo, actualizarContenidoArchivo);
  registerArchivosIpc(archivos, almacenamiento);

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

  // Gestion de flashcards
  const crearDeck = new CrearDeck(persistencia);
  const listarDecks =new ListarDecks(persistencia);
  const flashcards = new Flashcards(
    crearDeck,
    listarDecks,
    new CrearFlashcard(persistencia),
    new ListarFlashcards(persistencia)
  );

  registerFlashcardsIpc(
    flashcards
  );

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