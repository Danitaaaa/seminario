import { contextBridge } from 'electron';
import { pruebaApi } from './apis/prueba';
import { archivosApi } from './apis/archivos';

contextBridge.exposeInMainWorld('api', {
  ...pruebaApi,
  ...archivosApi,
});
