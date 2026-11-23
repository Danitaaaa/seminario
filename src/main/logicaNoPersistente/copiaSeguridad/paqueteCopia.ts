import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { ErrorCopiaInvalida } from './cifradoCopia';

// Lo que va adentro de una copia: los datos de la base (una tabla por archivo) y las carpetas con
// los archivos del usuario (material, fotos de perfil, fondos y portadas).
export interface DatosCopia {
  meta: MetaCopia;
  tablas: Record<string, string>; // nombre de la tabla -> sus filas en JSON
}

export interface MetaCopia {
  version: 1;
  fecha: string; // ISO
  appVersion: string;
  carpetaDatos: string; // userData de la compu donde se hizo (para corregir rutas al restaurar)
  usuarios: number;
}

export const CARPETAS_COPIA = ['archivos', 'fotosPerfil', 'fondosInicio', 'portadasProyectos'] as const;

function* archivosDe(carpeta: string, base = carpeta): Generator<{ completa: string; relativa: string }> {
  if (!fs.existsSync(carpeta)) return;
  for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const completa = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) yield* archivosDe(completa, base);
    else if (entrada.isFile()) yield { completa, relativa: path.relative(base, completa).split(path.sep).join('/') };
  }
}

export async function armarPaquete(datos: DatosCopia, carpetaDatos: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('meta.json', JSON.stringify(datos.meta));
  for (const [tabla, filas] of Object.entries(datos.tablas)) {
    zip.file(`tablas/${tabla}.json`, filas, { compression: 'DEFLATE' });
  }
  // Los archivos ya vienen comprimidos (PDF, Word, imágenes): se guardan tal cual, que es más rápido.
  for (const carpeta of CARPETAS_COPIA) {
    for (const { completa, relativa } of archivosDe(path.join(carpetaDatos, carpeta))) {
      zip.file(`carpetas/${carpeta}/${relativa}`, fs.readFileSync(completa), { compression: 'STORE' });
    }
  }
  return zip.generateAsync({ type: 'nodebuffer' });
}

export interface PaqueteLeido extends DatosCopia {
  archivos: { carpeta: string; relativa: string; leer: () => Promise<Buffer> }[];
}

export async function leerPaquete(contenido: Buffer): Promise<PaqueteLeido> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(contenido);
  } catch {
    throw new ErrorCopiaInvalida('La copia está dañada.');
  }
  const meta = zip.file('meta.json');
  if (!meta) throw new ErrorCopiaInvalida('La copia está dañada.');
  const datos: PaqueteLeido = { meta: JSON.parse(await meta.async('string')), tablas: {}, archivos: [] };
  if (datos.meta.version !== 1) throw new ErrorCopiaInvalida('La copia es de una versión de Syntra que esta no puede leer.');

  for (const [nombre, entrada] of Object.entries(zip.files)) {
    if (entrada.dir) continue;
    const tabla = /^tablas\/([a-z0-9_]+)\.json$/.exec(nombre);
    if (tabla) {
      datos.tablas[tabla[1]] = await entrada.async('string');
      continue;
    }
    const archivo = /^carpetas\/([A-Za-z]+)\/(.+)$/.exec(nombre);
    if (archivo && (CARPETAS_COPIA as readonly string[]).includes(archivo[1])) {
      datos.archivos.push({ carpeta: archivo[1], relativa: archivo[2], leer: () => entrada.async('nodebuffer') });
    }
  }
  return datos;
}

// Escribe un archivo de la copia sin dejar que su ruta se escape de la carpeta (por ejemplo, con "../").
export function rutaSegura(carpetaDestino: string, relativa: string): string {
  const base = path.resolve(carpetaDestino);
  const completa = path.resolve(base, relativa);
  if (!completa.startsWith(base + path.sep)) throw new ErrorCopiaInvalida('La copia tiene una ruta de archivo inválida.');
  return completa;
}
