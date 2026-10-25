import { ipcRenderer } from 'electron';

export const repeticionEspaciadaApi = {
  listarFlashcardsPendientes: (usuarioId: number) =>
    ipcRenderer.invoke('repeticionEspaciada:listarFlashcards', usuarioId),
  registrarRevision: (datos: unknown) =>
    ipcRenderer.invoke('repeticionEspaciada:registrarRevision', datos),
  listarRepeticionesMaterial: (usuarioId: number) =>
    ipcRenderer.invoke('repeticionEspaciada:listarMaterial', usuarioId),
  guardarRepeticionMaterial: (datos: unknown) =>
    ipcRenderer.invoke('repeticionEspaciada:guardarMaterial', datos),
};
