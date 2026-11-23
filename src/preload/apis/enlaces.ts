import { ipcRenderer } from "electron";

export const enlacesApi = {
  abrirEnlace: (datos: { enlace: 'github-dana' | 'github-caro' | 'github-ludmila' | 'correo' }) => ipcRenderer.invoke("enlaces:abrir", datos),
};