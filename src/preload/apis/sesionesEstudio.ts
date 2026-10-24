import { ipcRenderer } from 'electron';

// Canal por el que el main envía el estado de la sesión en curso cada segundo.
const CANAL_TICK_SESION = 'sesionEstudio:tick';

const conSesion = (canal: string) => (usuarioId: number, idSesion: number) =>
  ipcRenderer.invoke(canal, { usuarioId, idSesion });

// Funciones del módulo Sesión de estudio expuestas al renderer. Solo funciones puntuales, nunca ipcRenderer entero.
export const sesionesEstudioApi = {
  crearSesionEstudio: (datos: unknown) => ipcRenderer.invoke('sesionesEstudio:crear', datos),
  listarSesionesEstudio: (filtros: unknown) => ipcRenderer.invoke('sesionesEstudio:listar', filtros),
  abrirSesionEstudio: conSesion('sesionesEstudio:abrir'),
  iniciarSesionEstudio: conSesion('sesionesEstudio:iniciar'),
  pausarSesionEstudio: conSesion('sesionesEstudio:pausar'),
  reanudarSesionEstudio: conSesion('sesionesEstudio:reanudar'),
  finalizarSesionEstudio: conSesion('sesionesEstudio:finalizar'),
  modificarSesionEstudio: (datos: unknown) => ipcRenderer.invoke('sesionesEstudio:modificar', datos),
  eliminarSesionEstudio: conSesion('sesionesEstudio:eliminar'),

  listarPestanasSesion: conSesion('sesionesEstudio:pestanas'),
  crearPestanaSesion: (datos: unknown) => ipcRenderer.invoke('sesionesEstudio:pestanaCrear', datos),
  renombrarPestanaSesion: (datos: unknown) => ipcRenderer.invoke('sesionesEstudio:pestanaRenombrar', datos),
  eliminarPestanaSesion: (usuarioId: number, idPestana: number) =>
    ipcRenderer.invoke('sesionesEstudio:pestanaEliminar', { usuarioId, idPestana }),
  guardarContenidoSesionEstudio: (datos: unknown) => ipcRenderer.invoke('sesionesEstudio:guardarContenido', datos),

  agregarObjetivoSesion: (datos: unknown) => ipcRenderer.invoke('sesionesEstudio:objetivoAgregar', datos),
  actualizarObjetivoSesion: (datos: unknown) => ipcRenderer.invoke('sesionesEstudio:objetivoActualizar', datos),
  eliminarObjetivoSesion: (usuarioId: number, idObjetivo: number) =>
    ipcRenderer.invoke('sesionesEstudio:objetivoEliminar', { usuarioId, idObjetivo }),

  iniciarPomodoro: conSesion('sesionesEstudio:pomodoroIniciar'),
  pausarPomodoro: conSesion('sesionesEstudio:pomodoroPausar'),
  reiniciarPomodoro: conSesion('sesionesEstudio:pomodoroReiniciar'),
  cambiarFasePomodoro: (datos: unknown) => ipcRenderer.invoke('sesionesEstudio:pomodoroFase', datos),

  listarOpcionesSesionEstudio: () => ipcRenderer.invoke('sesionesEstudio:opciones'),
  registrarMateria: (datos: unknown) => ipcRenderer.invoke('sesionesEstudio:registrarMateria', datos),
  obtenerResumenSesiones: (datos: unknown) => ipcRenderer.invoke('sesionesEstudio:resumen', datos),
  obtenerSesionEnCurso: (usuarioId: number) => ipcRenderer.invoke('sesionesEstudio:enCurso', { usuarioId }),

  // Se suscribe al tick del main y devuelve la función para desuscribirse.
  onTickSesionEstudio: (callback: (snapshot: unknown) => void): (() => void) => {
    const escuchar = (_evento: unknown, snapshot: unknown) => callback(snapshot);
    ipcRenderer.on(CANAL_TICK_SESION, escuchar);
    return () => ipcRenderer.removeListener(CANAL_TICK_SESION, escuchar);
  },
};
