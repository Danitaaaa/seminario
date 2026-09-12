import { contextBridge } from 'electron';
import { pruebaApi } from './apis/prueba';

contextBridge.exposeInMainWorld('api', {
  ...pruebaApi,
});
