import { contextBridge } from 'electron';
import { nodosApi } from './apis/nodo';
import { archivosApi } from './apis/archivos';
import { usuariosApi } from './apis/Usuarios';
import { eventosApi } from './apis/eventos';
import { categoriasApi } from './apis/categorias';

contextBridge.exposeInMainWorld('api', {
  ...nodosApi,
  ...archivosApi,
  ...usuariosApi,
  ...eventosApi,
  ...categoriasApi,
});