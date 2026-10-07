import { contextBridge } from 'electron';
import { categoriasApi } from './apis/categorias';

import { eventosApi } from './apis/eventos';

contextBridge.exposeInMainWorld('api', {
  ...eventosApi,
  ...categoriasApi,
});
