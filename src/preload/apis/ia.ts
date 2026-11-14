import { ipcRenderer } from 'electron';

export interface EventoProgresoIA {
  id: string;
  estado: 'en_cola' | 'ejecutando' | 'terminado' | 'cancelado' | 'error';
  hechas?: number;
  total?: number;
}

export const iaApi = {
  // Router y cola
  generar: (pedido: {
    idTrabajo: string;
    tarea: 'resumen' | 'cuestionario' | 'mapaMental' | 'flashcards';
    texto: string;
    preferencias?: string;
  }) => ipcRenderer.invoke('ia:generar', pedido),
  cancelar: (idTrabajo: string) => ipcRenderer.invoke('ia:cancelar', idTrabajo),

  /** Devuelve la función para desuscribirse: llamala al desmontar el componente. */
  onProgreso: (cb: (e: EventoProgresoIA) => void) => {
    const h = (_: unknown, e: EventoProgresoIA) => cb(e);
    ipcRenderer.on('ia:progreso', h);
    return () => ipcRenderer.removeListener('ia:progreso', h);
  },

  // Claves 
  guardarClave: (proveedor: 'luna' | 'gemini', clave: string) => ipcRenderer.invoke('ia:guardarClave', proveedor, clave),
  tieneClave: (proveedor: 'luna' | 'gemini') => ipcRenderer.invoke('ia:tieneClave', proveedor),
  claveEnmascarada: (proveedor: 'luna' | 'gemini') => ipcRenderer.invoke('ia:claveEnmascarada', proveedor),
  borrarClave: (proveedor: 'luna' | 'gemini') => ipcRenderer.invoke('ia:borrarClave', proveedor),

  
  probarConexion: (proveedor: 'luna' | 'gemini' | 'gemma') => ipcRenderer.invoke('ia:probarConexion', proveedor),
  estadoOllama: () => ipcRenderer.invoke('ia:estadoOllama'),

  // Material con IA: generar desde un archivo de Material → pantalla previa → guardar.
  // Para el progreso y para cancelar se usan onProgreso y cancelar (la cola es una sola).
  generarMaterialIA: (datos: unknown) => ipcRenderer.invoke('materialIA:generar', datos),
  descartarMaterialIA: (datos: unknown) => ipcRenderer.invoke('materialIA:descartar', datos),
  guardarMaterialIA: (datos: unknown) => ipcRenderer.invoke('materialIA:guardar', datos),
  listarMaterialesIA: (datos?: unknown) => ipcRenderer.invoke('materialIA:listar', datos),
  obtenerMaterialIA: (datos: unknown) => ipcRenderer.invoke('materialIA:obtener', datos),
  eliminarMaterialIA: (datos: unknown) => ipcRenderer.invoke('materialIA:eliminar', datos),
  // Cuestionarios: corrige el main (las respuestas correctas llegan recién con el resultado).
  responderCuestionario: (datos: unknown) => ipcRenderer.invoke('materialIA:responderCuestionario', datos),
  listarIntentosCuestionario: (datos: unknown) => ipcRenderer.invoke('materialIA:listarIntentos', datos),
  editarMapaMental: (datos: unknown) => ipcRenderer.invoke('materialIA:editarMapaMental', datos),
  // Resúmenes como documento: se editan y se guardan como Word en Material › "Resúmenes".
  generarResumenDocumento: (datos: unknown) => ipcRenderer.invoke('resumenIA:generar', datos),
  guardarResumenDocumento: (datos: unknown) => ipcRenderer.invoke('resumenIA:guardar', datos),

  // Chat con IA: las conversaciones quedan guardadas. Para cortar una respuesta: cancelar(trabajoId).
  enviarMensajeChat: (datos: unknown) => ipcRenderer.invoke('chatIA:enviar', datos),
  listarConversacionesIA: () => ipcRenderer.invoke('chatIA:listar'),
  obtenerConversacionIA: (datos: unknown) => ipcRenderer.invoke('chatIA:obtener', datos),
  renombrarConversacionIA: (datos: unknown) => ipcRenderer.invoke('chatIA:renombrar', datos),
  eliminarConversacionIA: (datos: unknown) => ipcRenderer.invoke('chatIA:eliminar', datos),
};

export type ApiIA = typeof iaApi;
