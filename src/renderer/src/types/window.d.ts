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
      ) => Promise<{ id: number }>;

      registrarUsuario: (
        datos: {
          nombre: string;
          apellido: string;
          apodo: string;
          email: string;
          fechaNacimiento: Date;
          password: string;
          confirmPassword: string;
        }
      ) => Promise<{ id: number }>;

      verificarMail: (
        datos: {
          email: string;
          codigo: string;
        }
      ) => Promise<void>;

      recuperarPassword: (
        datos: {
          email: string;
        }
      ) => Promise<void>;

      validarCodigo: (
        datos: {
          email: string;
          codigo: string;
        }
      ) => Promise<void>;

      cambiarPassword: (
        datos: {
          email: string;
          nuevaPassword: string;
        }
      ) => Promise<void>;

      registrarRostro(
        usuarioId: number,
        embedding: number[]
      ): Promise<{ exito: boolean; mensaje: string }>
      
      loginFacial(
        embedding: number[]
      ): Promise<
        | { exito: true; usuarioId: number }
        | { exito: false; mensaje: string }
      >

    };
  }
}

export {};
