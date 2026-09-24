import { Nodo } from './nodo';

declare global {
  interface Window {
    api: {
      crearNodo: (datos: unknown) => Promise<Nodo>;
      modificarNodo: (datos: unknown) => Promise<Nodo>;
      moverNodo: (datos: unknown) => Promise<Nodo>;
      buscarNodos: (criterios: unknown) => Promise<Nodo>;
      eliminarNodo: (datos: unknown) => Promise<void>;
    };
  }
}
