import { contextBridge } from 'electron';
import { nodosApi } from './apis/nodo';
import { archivosApi } from './apis/archivos';

contextBridge.exposeInMainWorld('api', {
  ...nodosApi,
  ...archivosApi,
});
