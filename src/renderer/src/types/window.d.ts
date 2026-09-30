import { Archivo } from './archivo';
import { Nodo } from './nodo';

declare global {
  interface Window {
    api: {
      crearNodo: (datos: { nombre: string; idPadre: number | null }) => Promise<Nodo>;
      modificarNodo: (datos: { id: number; nombre: string }) => Promise<Nodo>;
      moverNodo: (datos: { id: number; idNuevoPadre: number | null }) => Promise<Nodo>;
      listarContenido: (criterios: unknown) => Promise<Nodo[]>;
      eliminarNodo: (datos: { id: number }) => Promise<void>;
      crearArchivo: (datos: {
        nombre: string;
        extension: string;
        rutaFisica: string;
        tamanio: number;
        idPadre: number;
      }) => Promise<Archivo>;
      seleccionarArchivo: () => Promise<{
        nombre: string;
        extension: string;
        rutaFisica: string;
        tamanio: number;
      } | null>;
      modificarArchivo: (datos: { id: number; nombre: string }) => Promise<Archivo>;
      eliminarArchivo: (datos: { id: number }) => Promise<void>;
      moverArchivos: (datos: { ids: number[]; idPadre: number }) => Promise<Archivo[]>;
      leerArchivo: (datos: { id: number }) => Promise<{ archivo: Archivo; contenido: Uint8Array }>;
      guardarArchivo: (datos: { id: number; contenido: Uint8Array }) => Promise<Archivo>;
      guardarDocx: (datos: { id: number; html: string }) => Promise<Archivo>;
      abrirExterno: (datos: { id: number }) => Promise<void>;
    };
  }
}