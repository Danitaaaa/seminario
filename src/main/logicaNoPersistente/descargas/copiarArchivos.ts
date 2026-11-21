import fs from 'node:fs';
import path from 'node:path';

// Descargar = copiar el archivo guardado por Syntra a una carpeta que elige el usuario.
// No sabe de la base: recibe las rutas ya resueltas.

export interface ArchivoACopiar {
  origen: string; // ruta completa dentro del almacenamiento de Syntra
  nombre: string;
  extension: string;
}

// Caracteres que Windows no acepta en un nombre de archivo.
export const nombreSeguro = (nombre: string) => nombre.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim() || 'archivo';

const conExtension = (nombre: string, extension: string) => (extension ? `${nombre}.${extension}` : nombre);

// "Apunte.pdf" → "Apunte (2).pdf" si ya hay uno con ese nombre en la carpeta: nunca pisa nada.
function rutaSinPisar(carpeta: string, nombre: string, extension: string): string {
  const base = nombreSeguro(nombre);
  let candidato = path.join(carpeta, conExtension(base, extension));
  for (let i = 2; fs.existsSync(candidato); i++) candidato = path.join(carpeta, conExtension(`${base} (${i})`, extension));
  return candidato;
}

export async function copiarUno(origen: string, destino: string): Promise<void> {
  await fs.promises.copyFile(origen, destino);
}

// Copia varios a una carpeta. Devuelve cuántos se copiaron (los que fallan no frenan a los demás).
export async function copiarACarpeta(carpeta: string, archivos: ArchivoACopiar[]): Promise<{ copiados: number; fallidos: number }> {
  let copiados = 0;
  for (const archivo of archivos) {
    try {
      await fs.promises.copyFile(archivo.origen, rutaSinPisar(carpeta, archivo.nombre, archivo.extension));
      copiados++;
    } catch (error) {
      console.error('[Descargas] No se pudo copiar', archivo.nombre, error);
    }
  }
  return { copiados, fallidos: archivos.length - copiados };
}
