import { contextBridge } from 'electron';
import { nodosApi } from './apis/nodo';
import { archivosApi } from './apis/archivos';
import { usuariosApi } from './apis/usuarios';
import { eventosApi } from './apis/eventos';
import { categoriasApi } from './apis/categorias';
import { horariosApi } from './apis/horarios';

contextBridge.exposeInMainWorld('api', {
  ...nodosApi,
  ...archivosApi,
  ...usuariosApi,
  ...eventosApi,
  ...categoriasApi,
  ...horariosApi,
});