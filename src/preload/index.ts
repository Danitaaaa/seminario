import { contextBridge } from 'electron';
import { pruebaApi } from './apis/prueba';
import { horariosApi } from './apis/horarios';
import { categoriasApi } from './apis/categorias';

import { eventosApi } from './apis/eventos';

contextBridge.exposeInMainWorld('api', {
  ...pruebaApi,
  ...eventosApi,
  ...horariosApi,
  ...categoriasApi,
});
