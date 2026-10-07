import 'dotenv/config';
import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import { config } from 'dotenv';

import { pool, verifyDbConnection } from './persistencia/BaseDeDatos';
import { Persistencia } from './persistencia/Persistencia';


import { CrearHorario } from './logicaPersistente/gestionDeHorarios/CrearHorario';
import { ListarHorarios } from './logicaPersistente/gestionDeHorarios/ListarHorarios';
import { ModificarHorario } from './logicaPersistente/gestionDeHorarios/ModificarHorario';
import { EliminarHorario } from './logicaPersistente/gestionDeHorarios/EliminarHorario';
import { Horarios } from './administracionDePersistencia/Horarios';
import { registerHorariosIpc } from './ipc/horarios.ipc';

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


  // Repetir para Gestión de Eventos, Gestión de Sesión, Proyectos, Usuario...
 const horarios = new Horarios(
    new CrearHorario(persistencia), new ListarHorarios(persistencia),
    new ModificarHorario(persistencia), new EliminarHorario(persistencia)
  );
  registerHorariosIpc(horarios);

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
