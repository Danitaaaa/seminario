import { Saludo } from './prueba';

declare global {
  interface Window {
    api: {
      obtenerSaludo: () => Promise<Saludo | null>;
      // agregar aquí cada función que se exponga en preload/index.ts
    };
  }
}
