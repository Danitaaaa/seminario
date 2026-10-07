import 'dotenv/config';
import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import { config } from 'dotenv';

import { pool, verifyDbConnection } from './persistencia/BaseDeDatos';
import { Persistencia } from './persistencia/Persistencia';

import { CrearEvento } from './logicaPersistente/gestionDeEventos/CrearEvento';
import { ListarEventos } from './logicaPersistente/gestionDeEventos/ListarEventos';
import { ModificarEvento } from './logicaPersistente/gestionDeEventos/ModificarEvento';
import { EliminarEvento } from './logicaPersistente/gestionDeEventos/EliminarEvento';
import { Eventos } from './administracionDePersistencia/Eventos';
import { registerEventosIpc } from './ipc/eventos.ipc';

import { CrearCategoria } from './logicaPersistente/gestionDeCategorias/CrearCategoria';
import { ListarCategorias } from './logicaPersistente/gestionDeCategorias/ListarCategorias';
import { ModificarCategoria } from './logicaPersistente/gestionDeCategorias/ModificarCategoria';
import { EliminarCategoria } from './logicaPersistente/gestionDeCategorias/EliminarCategoria';
import { Categorias } from './administracionDePersistencia/Categorias';
import { registerCategoriasIpc } from './ipc/categorias.ipc';

let mainWindow: BrowserWindow | null = null;

config({ path: join(__dirname, "../../.env") });
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

// --- Composición: igual que antes, sin cambios por usar Vite ---
function wireDependencies(): void {
  const persistencia = new Persistencia(pool);

  // Repetir para Gestión de Eventos, Gestión de Sesión, Proyectos, Usuario...
  const crearEvento = new CrearEvento(persistencia);
  const listarEventos = new ListarEventos(persistencia);
  const modificarEvento = new ModificarEvento(persistencia);
  const eliminarEvento = new EliminarEvento(persistencia);
  const eventos = new Eventos(crearEvento, listarEventos, modificarEvento, eliminarEvento);
  registerEventosIpc(eventos);

  const categorias = new Categorias(
    new CrearCategoria(persistencia), new ListarCategorias(persistencia),
    new ModificarCategoria(persistencia), new EliminarCategoria(persistencia)
  );
  registerCategoriasIpc(categorias);
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
