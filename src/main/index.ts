import 'dotenv/config';
import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import { config } from 'dotenv';

import { pool, verifyDbConnection } from './persistencia/baseDeDatos';
import { Persistencia } from './persistencia/persistencia';

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

let mainWindow: BrowserWindow | null = null;

config({ path: join(__dirname, "../../.env") });
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // evita el "flash" blanco: se muestra recién cuando el contenido está listo
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  // Clave con electron-vite: en desarrollo carga el servidor Vite (hot reload);
  // en producción carga el HTML ya compilado por Vite.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// --- Composición: igual que antes, sin cambios por usar Vite ---
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
  const nodos = new Nodos(crearNodo, modificarNodo, listarContenido,
    eliminarNodo, moverNodo );
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
  registerArchivosIpc(archivos);
}

app.whenReady().then(async () => {
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