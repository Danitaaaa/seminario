import { ipcRenderer } from 'electron';

export const edicionApi = {
    iniciarEdicion: (clave: unknown) => ipcRenderer.invoke('edicion:iniciar', clave),
    guardarEdicion: (clave: unknown) => ipcRenderer.invoke('edicion:guardar', clave),
    finalizarEdicion: (clave: unknown) => ipcRenderer.invoke('edicion:finalizar', clave),
    consultarEdicion: (clave: unknown) => ipcRenderer.invoke('edicion:consultar', clave),
    listarConflictos: (datos: unknown) => ipcRenderer.invoke('edicion:listarConflictos', datos),
    obtenerConflicto: (clave: unknown) => ipcRenderer.invoke('edicion:obtenerConflicto', clave),
    resolverConflicto: (datos: unknown) => ipcRenderer.invoke('edicion:resolverConflicto', datos),
    iniciarSincronizacion: (datos: { idUsuario: number }) => ipcRenderer.invoke('sincronizacion:iniciar', datos),

    /** Eventos en vivo del main (bloqueos, cambios recibidos, conexión). Devuelve la función para desuscribirse. */
    alEventoSincronizacion: (cb: (evento: unknown) => void) => {
        const escucha = (_e: unknown, evento: unknown) => cb(evento);
        ipcRenderer.on('sincronizacion:evento', escucha);
        return () => ipcRenderer.removeListener('sincronizacion:evento', escucha);
    },
};