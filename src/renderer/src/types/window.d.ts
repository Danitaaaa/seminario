import { Saludo } from './prueba';
import { Archivo } from './archivo';

declare global {
  interface Window {
    api: {
      obtenerSaludo: () => Promise<Saludo | null>;

      crearArchivo: (datos: {
        nombre: string;
        extension: string;
        rutaFisica: string;
        tamanio: number;
        nodoPadreId: number | null;
        usuarioId: number | null;
        proyectoId: number | null;
      }) => Promise<Archivo>;
      listarArchivos: () => Promise<Archivo[]>;
      seleccionarArchivo: () => Promise<{
        nombre: string;
        extension: string;
        rutaFisica: string;
        tamanio: number;
      } | null>;
      modificarArchivo: (datos: { id: number; nombre: string }) => Promise<Archivo>;
      eliminarArchivo: (datos: { id: number }) => Promise<void>;
      listarCarpetas: () => Promise<{ id: number; nombre: string }[]>;
      moverArchivos: (datos: { ids: number[]; carpetaId: number | null }) => Promise<Archivo[]>;
    };
  }
}