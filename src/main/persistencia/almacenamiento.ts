import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

export class Almacenamiento {
  private readonly base: string;

  constructor(base: string) {
    this.base = path.resolve(base);
    fs.mkdirSync(this.base, { recursive: true });
  }

  // Convierte la ruta relativa de la base en ruta completa, validando que no se escape de la base.
  rutaCompleta(rutaRelativa: string): string {
    const completa = path.resolve(this.base, rutaRelativa);
    if (!completa.startsWith(this.base + path.sep)) {
      throw new Error('Ruta de archivo inválida');
    }
    return completa;
  }

  // Lee el contenido de un archivo guardado a partir de su ruta RELATIVA (la de la base de datos).
  async leer(rutaRelativa: string): Promise<Uint8Array> {
    return fs.promises.readFile(this.rutaCompleta(rutaRelativa));
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

 async reemplazar(rutaRelativa: string, rutaOrigen: string): Promise<number> {
    const destino = this.rutaCompleta(rutaRelativa);
    const temporal = `${destino}.tmp`;
    await fs.promises.copyFile(rutaOrigen, temporal);
    try {
      await this.renombrarConReintentos(temporal, destino);
    } catch (error) {
      await fs.promises.rm(temporal, { force: true });
      if (this.estaBloqueado(error)) {
        throw new Error('No se pudo guardar: el archivo está abierto en otra aplicación (por ejemplo, Word). Cerralo y volvé a intentar.');
      }
      throw error;
    }
    return (await fs.promises.stat(destino)).size;
  }

  // Reintenta el rename si el archivo está bloqueado por un momento (antivirus, indexador de Windows).
  private async renombrarConReintentos(origen: string, destino: string): Promise<void> {
    const esperasMs = [100, 250, 500, 1000];
    for (let intento = 0; ; intento++) {
      try {
        await fs.promises.rename(origen, destino);
        return;
      } catch (error) {
        if (!this.estaBloqueado(error) || intento >= esperasMs.length) throw error;
        await new Promise((resolver) => setTimeout(resolver, esperasMs[intento]));
      }
    }
  }

  // Errores que da Windows cuando otro programa tiene el archivo abierto.
  private estaBloqueado(error: unknown): boolean {
    const codigo = (error as NodeJS.ErrnoException)?.code;
    return codigo === 'EPERM' || codigo === 'EBUSY' || codigo === 'EACCES';
  }

  // Borra el archivo físico; no falla si ya no existe.
  async eliminar(rutaRelativa: string): Promise<void> {
    await fs.promises.rm(this.rutaCompleta(rutaRelativa), { force: true });
  }
}