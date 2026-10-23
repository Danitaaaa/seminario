import { ipcRenderer } from 'electron';

// Canal por el que el main envía el estado de la sesión en curso cada segundo.
const CANAL_TICK_SESION = 'sesionEstudio:tick';

// Funciones del módulo Sesión de estudio expuestas al renderer. Solo funciones puntuales, nunca ipcRenderer entero.
export const sesionesEstudioApi = {
  crearSesionEstudio: (datos: unknown) => ipcRenderer.invoke('sesionesEstudio:crear', datos),
  listarSesionesEstudio: (filtros: unknown) => ipcRenderer.invoke('sesionesEstudio:listar', filtros),
  abrirSesionEstudio: (usuarioId: number, idSesion: number) =>
    ipcRenderer.invoke('sesionesEstudio:abrir', { usuarioId, idSesion }),
  iniciarSesionEstudio: (usuarioId: number, idSesion: number) =>
    ipcRenderer.invoke('sesionesEstudio:iniciar', { usuarioId, idSesion }),
  finalizarSesionEstudio: (usuarioId: number, idSesion: number) =>
    ipcRenderer.invoke('sesionesEstudio:finalizar', { usuarioId, idSesion }),
  modificarSesionEstudio: (datos: unknown) => ipcRenderer.invoke('sesionesEstudio:modificar', datos),
  guardarContenidoSesionEstudio: (datos: unknown) => ipcRenderer.invoke('sesionesEstudio:guardarContenido', datos),
  eliminarSesionEstudio: (usuarioId: number, idSesion: number) =>
    ipcRenderer.invoke('sesionesEstudio:eliminar', { usuarioId, idSesion }),
  agregarObjetivoSesion: (datos: unknown) => ipcRenderer.invoke('sesionesEstudio:objetivoAgregar', datos),
  actualizarObjetivoSesion: (datos: unknown) => ipcRenderer.invoke('sesionesEstudio:objetivoActualizar', datos),
  eliminarObjetivoSesion: (usuarioId: number, idObjetivo: number) =>
    ipcRenderer.invoke('sesionesEstudio:objetivoEliminar', { usuarioId, idObjetivo }),
  listarOpcionesSesionEstudio: () => ipcRenderer.invoke('sesionesEstudio:opciones'),
  obtenerSesionEnCurso: (usuarioId: number) => ipcRenderer.invoke('sesionesEstudio:enCurso', { usuarioId }),

  // Se suscribe al tick del main y devuelve la función para desuscribirse.
  onTickSesionEstudio: (callback: (snapshot: unknown) => void): (() => void) => {
    const escuchar = (_evento: unknown, snapshot: unknown) => callback(snapshot);
    ipcRenderer.on(CANAL_TICK_SESION, escuchar);
    return () => ipcRenderer.removeListener(CANAL_TICK_SESION, escuchar);
  },
};
