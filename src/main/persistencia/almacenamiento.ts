import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

export class Almacenamiento {
  private readonly base: string;

  constructor(base: string) {
    this.base = path.resolve(base);
    fs.mkdirSync(this.base, { recursive: true });
  }

  // Copia el archivo al almacenamiento con nombre único.
  // Devuelve la ruta RELATIVA (para guardar en la base) y el tamaño real.
  async guardar(rutaOrigen: string, extension: string): Promise<{ rutaFisica: string; tamanio: number }> {
    const extLimpia = extension.replace(/[^a-zA-Z0-9]/g, '');
    const rutaFisica = `${randomUUID()}.${extLimpia}`;
    const destino = path.join(this.base, rutaFisica);
    await fs.promises.copyFile(rutaOrigen, destino);
    const { size } = await fs.promises.stat(destino);
    return { rutaFisica, tamanio: size };
  }

  // Sobrescribe el archivo de forma segura (temporal + rename) y devuelve el nuevo tamaño.
  async reemplazar(rutaRelativa: string, rutaOrigen: string): Promise<number> {
    const destino = this.rutaCompleta(rutaRelativa);
    const temporal = `${destino}.tmp`;
    await fs.promises.copyFile(rutaOrigen, temporal);
    await fs.promises.rename(temporal, destino);
    return (await fs.promises.stat(destino)).size;
  }

  // Convierte la ruta relativa de la base en ruta completa, validando que no se escape de la base.
  rutaCompleta(rutaRelativa: string): string {
    const completa = path.resolve(this.base, rutaRelativa);
    if (!completa.startsWith(this.base + path.sep)) {
      throw new Error('Ruta de archivo inválida');
    }
    return completa;
  }

  // Borra el archivo físico; no falla si ya no existe.
  async eliminar(rutaRelativa: string): Promise<void> {
    await fs.promises.rm(this.rutaCompleta(rutaRelativa), { force: true });
  }
}