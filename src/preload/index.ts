import { contextBridge } from 'electron';
import { nodosApi } from './apis/nodo';
import { archivosApi } from './apis/archivos';
import { usuariosApi } from './apis/Usuarios';

contextBridge.exposeInMainWorld('api', {
  ...nodosApi,
  ...archivosApi,
  ...usuariosApi,
});