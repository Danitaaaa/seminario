import { contextBridge } from 'electron';
import { nodosApi } from './apis/nodo';
import { archivosApi } from './apis/archivos';
import { usuariosApi } from './apis/usuarios';
import { eventosApi } from './apis/eventos';
import { categoriasApi } from './apis/categorias';
import { horariosApi } from './apis/horarios';
import { enlacesApi } from './apis/enlaces';
import { driveApi } from './apis/drive';
import { metasApi } from './apis/metas';
import { inicioApi } from './apis/inicio';
import { flashcardsApi } from './apis/flashcards';
import { repeticionEspaciadaApi } from './apis/repeticionEspaciada';
import { notificacionesApi } from './apis/notificaciones';
import { proyectosApi } from './apis/proyectos';
import { tareasApi } from './apis/tareas';
import { edicionApi } from './apis/edicion';
import { portadasProyectosApi } from './apis/portadasProyectos';

contextBridge.exposeInMainWorld('api', {
  ...nodosApi,
  ...archivosApi,
  ...usuariosApi,
  ...eventosApi,
  ...categoriasApi,
  ...horariosApi,
  ...enlacesApi,
  ...driveApi,
  ...metasApi,
  ...inicioApi,
  ...flashcardsApi,
  ...repeticionEspaciadaApi,
  ...notificacionesApi,
  ...proyectosApi,
  ...tareasApi,
  ...edicionApi,
  ...portadasProyectosApi,
});