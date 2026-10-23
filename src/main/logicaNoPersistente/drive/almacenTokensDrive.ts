import fs from 'node:fs';
import path from 'node:path';
import type { AlmacenTokens } from './oauthDrive';

// Cifrado del sistema operativo. En la app lo provee safeStorage de Electron (ver cifradorElectron.ts).
export interface Cifrador {
  disponible(): boolean;
  cifrar(texto: string): Buffer;
  descifrar(datos: Buffer): string;
}

// Guarda el refresh token cifrado en un archivo de la carpeta de datos de la app.
export class AlmacenTokensDrive implements AlmacenTokens {
  constructor(
    private readonly archivo: string,
    private readonly cifrador: Cifrador,
  ) {}

  async leerRefreshToken(): Promise<string | null> {
    if (!fs.existsSync(this.archivo)) return null;
    return this.cifrador.descifrar(fs.readFileSync(this.archivo));
  }

  async guardarRefreshToken(token: string): Promise<void> {
    if (!this.cifrador.disponible()) {
      throw new Error('No hay cifrado disponible en este equipo.');
    }
    fs.mkdirSync(path.dirname(this.archivo), { recursive: true });
    fs.writeFileSync(this.archivo, this.cifrador.cifrar(token));
  }
}