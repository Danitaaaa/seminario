import 'dotenv/config';
import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import { config } from 'dotenv';

import { pool, verifyDbConnection } from './persistencia/BaseDeDatos';
import { Persistencia } from './persistencia/Persistencia';


import { ObtenerSaludo } from './logicaPersistente/gestionDePrueba/ObtenerSaludo';
import { Prueba } from './administracionDePersistencia/Prueba';
import { registerPruebaIpc } from './ipc/prueba.ipc';
import { IniciarSesion } from './logicaPersistente/gestionDeUsuarios/IniciarSesion';
import { Usuarios } from './administracionDePersistencia/Usuarios';
import { registerUsuariosIpc } from './ipc/Usuarios.ipc';

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


  const obtenerSaludo = new ObtenerSaludo(persistencia);
  const prueba = new Prueba(obtenerSaludo);
  registerPruebaIpc(prueba);

  const iniciarSesion = new IniciarSesion(persistencia);
  const usuarios = new Usuarios(iniciarSesion);
  registerUsuariosIpc(usuarios);
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
