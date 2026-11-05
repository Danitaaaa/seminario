import fs from 'node:fs/promises';
import path from 'node:path';

// Sube a Material carpetas y archivos del equipo, respetando la estructura de subcarpetas.
// No toca la base directamente: usa el destino que le pasan (las mismas fachadas de siempre,
// así se siguen chequeando los permisos de proyecto).

export interface DestinoImportacion {
  // Nombres ya usados en una carpeta: carpetas como "Apuntes", archivos como "resumen.pdf" (en minúscula).
  nombresEn(idPadre: number): Promise<Set<string>>;
  crearCarpeta(nombre: string, idPadre: number): Promise<number>;
  crearArchivo(ruta: string, nombre: string, extension: string, idPadre: number): Promise<void>;
}

export interface ResultadoImportacion {
  carpetas: number;
  archivos: number;
  salteados: number; // ocultos, de sistema o sin extensión válida
}

const MAXIMO_ELEMENTOS = 1000;
const DE_SISTEMA = new Set(['desktop.ini', 'thumbs.db', '.ds_store']);
const EXTENSION_VALIDA = /^[a-zA-Z0-9]{1,20}$/;

const esIgnorado = (nombre: string) => nombre.startsWith('.') || nombre.startsWith('~$') || DE_SISTEMA.has(nombre.toLowerCase());

// "Apuntes" → "Apuntes (2)" si ya existe; en archivos el número va antes de la extensión.
function nombreLibre(nombre: string, extension: string, usados: Set<string>): string {
  const clave = (n: string) => (extension ? `${n}.${extension}` : n).toLowerCase();
  let candidato = nombre;
  for (let i = 2; usados.has(clave(candidato)); i++) candidato = `${nombre} (${i})`;
  usados.add(clave(candidato));
  return candidato;
}

async function contar(ruta: string, total: number): Promise<number> {
  if (total > MAXIMO_ELEMENTOS) return total;
  const info = await fs.lstat(ruta);
  if (!info.isDirectory()) return total + 1;
  let suma = total + 1;
  for (const hijo of await fs.readdir(ruta)) suma = await contar(path.join(ruta, hijo), suma);
  return suma;
}

export async function importarRutas(rutas: string[], idPadre: number, destino: DestinoImportacion): Promise<ResultadoImportacion> {
  let total = 0;
  for (const ruta of rutas) total = await contar(ruta, total);
  if (total > MAXIMO_ELEMENTOS) throw new Error(`Es demasiado para subir de una vez (máximo ${MAXIMO_ELEMENTOS} archivos y carpetas).`);

  const resultado: ResultadoImportacion = { carpetas: 0, archivos: 0, salteados: 0 };
  const usados = new Map<number, Set<string>>();
  const usadosEn = async (id: number) => {
    if (!usados.has(id)) usados.set(id, await destino.nombresEn(id));
    return usados.get(id)!;
  };

  async function importar(ruta: string, idDestino: number): Promise<void> {
    const info = await fs.lstat(ruta);
    const base = path.basename(ruta);
    if (info.isSymbolicLink() || esIgnorado(base)) {
      resultado.salteados++;
      return;
    }

    if (info.isDirectory()) {
      const nombre = nombreLibre(base, '', await usadosEn(idDestino));
      const idCarpeta = await destino.crearCarpeta(nombre, idDestino);
      usados.set(idCarpeta, new Set());
      resultado.carpetas++;
      const hijos = (await fs.readdir(ruta)).sort((a, b) => a.localeCompare(b, 'es'));
      for (const hijo of hijos) await importar(path.join(ruta, hijo), idCarpeta);
      return;
    }

    const extension = path.extname(base).slice(1);
    const nombre = path.basename(base, path.extname(base));
    if (!info.isFile() || !nombre || !EXTENSION_VALIDA.test(extension)) {
      resultado.salteados++;
      return;
    }
    await destino.crearArchivo(ruta, nombreLibre(nombre, extension, await usadosEn(idDestino)), extension, idDestino);
    resultado.archivos++;
  }

  for (const ruta of rutas) await importar(ruta, idPadre);
  return resultado;
}
