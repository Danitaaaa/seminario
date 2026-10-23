import { ipcRenderer } from "electron";

export const enlacesApi = {
  abrirEnlace: (datos: { enlace: 'github-dana' | 'correo' }) => ipcRenderer.invoke("enlaces:abrir", datos),
};