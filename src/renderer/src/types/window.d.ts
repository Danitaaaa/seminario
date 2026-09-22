import { Saludo } from './prueba';

declare global {
  interface Window {
    api: {

      obtenerSaludo: () =>
        Promise<Saludo | null>;

      iniciarSesion: (
        datos: {
          email: string;
          password: string;
        }
      ) => Promise<unknown>;

      registrarUsuario: (
        datos: {
          nombre: string;
          apellido: string;
          apodo: string;
          email: string;
          fechaNacimiento: Date;
          password: string;
        }
      ) => Promise<void>;

      verificarMail: (
        datos: {
          email: string;
          codigo: string;
        }
      ) => Promise<void>;

    };
  }
}

export {};

