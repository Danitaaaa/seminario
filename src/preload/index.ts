import { contextBridge } from 'electron';
import { nodosApi } from './apis/nodo';
import { archivosApi } from './apis/archivos';
import { usuariosApi } from './apis/usuarios';
import { eventosApi } from './apis/eventos';
import { categoriasApi } from './apis/categorias';
import { horariosApi } from './apis/horarios';
import { proyectosApi } from './apis/proyectos';
import { metasApi } from './apis/metas';
import { tareasApi } from './apis/tareas';
import { edicionApi } from './apis/edicion';

contextBridge.exposeInMainWorld('api', {
  ...nodosApi,
  ...archivosApi,
  ...usuariosApi,
  ...eventosApi,
  ...categoriasApi,
  ...horariosApi,
  ...proyectosApi,
  ...metasApi,
  ...tareasApi,
  ...edicionApi,
});