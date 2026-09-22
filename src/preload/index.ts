import { contextBridge } from 'electron';
import { pruebaApi } from './apis/prueba';
import { usuariosApi } from './apis/Usuarios';

contextBridge.exposeInMainWorld('api', {
  ...pruebaApi,
  ...usuariosApi,
});
