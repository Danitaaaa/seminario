// src/main/servicios/ia/InstaladorOllama.ts
// Deja a Ollama listo SIN instaladores del sistema: baja el paquete oficial independiente y lo descomprime en una
// carpeta propia de la app (userData/ollama). No pide administrador, no toca el PATH ni el registro, y la app controla
// el proceso (lo inicia, lo apaga al cerrar, lo puede borrar con desinstalar()).
//
// Orden: 1) si el usuario ya tiene Ollama (PATH o rutas conocidas) se usa ese; 2) si no, el de la carpeta propia;
// 3) si tampoco está, instalar() baja el paquete de este sistema:
//   Windows → ollama-windows-amd64.zip       (CLI independiente documentado por Ollama; se abre con el tar de Windows)
//   Linux   → ollama-linux-{amd64,arm64}.tar.zst  (zstd con zlib de Node, o `tar --zstd` si ese Node no lo trae)
//   macOS   → Ollama-darwin.zip              (unzip; el ejecutable queda en Ollama.app/Contents/Resources/ollama)
// Para GPUs AMD se baja además el paquete ROCm (opción `conRocm`) y se extrae en la misma carpeta.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, statSync } from 'node:fs';
import { chmod, mkdir, open, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { Readable, type Transform } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { pipeline } from 'node:stream/promises';
import * as zlib from 'node:zlib';

export type ProgresoInstalacion =
  | { fase: 'descargando'; porcentaje: number | null }
  | { fase: 'instalando' };

export type FormatoPaquete = 'zip' | 'tar.zst';

interface Paquete {
  archivo: string; // nombre en ollama.com/download y en las releases de GitHub
  formato: FormatoPaquete;
  principal: boolean; // el ROCm es aditivo: no puede ir solo
}

export interface OpcionesInstaladorOllama {
  /** Carpeta propia donde queda Ollama (ej. join(app.getPath('userData'), 'ollama')). */
  carpetaInstalacion: string;
  /** Bajar también el paquete ROCm (GPUs AMD). Con NVIDIA o solo CPU alcanza con el principal. */
  conRocm?: boolean;
  /** SHA-256 esperado del paquete principal (opcional). Útil si fijás una versión concreta. */
  sha256?: string;
  /** De dónde bajar cada paquete, en orden: si falla una se prueba la siguiente. */
  urlsDe?: (archivo: string) => string[];
  plataforma?: NodeJS.Platform; // inyectables para tests
  arquitectura?: string;
  /** Ollama que el usuario ya tenga (inyectable para tests). */
  rutaExistente?: () => string | null;
  /** Carpetas del PATH (inyectable para tests). */
  rutasPath?: string[];
  /** Descomprime un paquete dentro de `destino` (inyectable para tests). */
  extraer?: (archivo: string, destino: string, formato: FormatoPaquete, senal?: AbortSignal) => Promise<void>;
}

/** Página oficial de descargas: es lo que la pantalla muestra cuando la instalación automática no sirve. */
export const URL_DESCARGA_OLLAMA = 'https://ollama.com/download';

const urlsPorDefecto = (archivo: string): string[] => [
  `https://ollama.com/download/${archivo}`,
  `https://github.com/ollama/ollama/releases/latest/download/${archivo}`,
];

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class InstaladorOllama {
  private readonly plataforma: NodeJS.Platform;
  private readonly arquitectura: string;

  constructor(private readonly o: OpcionesInstaladorOllama) {
    this.plataforma = o.plataforma ?? process.platform;
    this.arquitectura = o.arquitectura ?? process.arch;
  }

  /** ¿Hay paquete independiente para esta compu? */
  get soportado(): boolean {
    console.log("soportado:", this.paquetes() !== null);
    return this.paquetes() !== null;
  }

  get urlDescarga(): string {
    return URL_DESCARGA_OLLAMA;
  }

  /** Ollama a usar: primero el que ya tenga el usuario, después el de la carpeta propia. null si no hay ninguno. */
  rutaEjecutable(): string | null {
    return this.rutaExistente() ?? this.rutaPropia();
  }

  /** Ollama del usuario: en el PATH o en las rutas donde lo dejan los instaladores oficiales. */
  rutaExistente(): string | null {
    if (this.o.rutaExistente) return this.o.rutaExistente();
    const nombre = this.plataforma === 'win32' ? 'ollama.exe' : 'ollama';
    const dirs = this.o.rutasPath ?? (process.env.PATH ?? '').split(delimiter);
    const candidatas = [...dirs.filter(Boolean).map((d) => join(d, nombre)), ...this.rutasConocidas()];
    return candidatas.find(esArchivo) ?? null;
  }

  /** Ollama de la carpeta propia (el que instala esta clase). */
  rutaPropia(): string | null {
    const ruta = this.ejecutableEn(this.o.carpetaInstalacion);
    return esArchivo(ruta) ? ruta : null;
  }

  /** Descarga y descomprime Ollama en la carpeta propia. Lanza Error con un mensaje legible si algo sale mal. */
  async instalar(alProgreso: (p: ProgresoInstalacion) => void, senal?: AbortSignal): Promise<void> {
    console.log("empezando instalacion llama");
    const paquetes = this.paquetes();
    console.log("paquetes");
    if (!paquetes) throw new Error('No hay un paquete independiente de Ollama para este sistema.');
    if (this.rutaEjecutable()) return; // ya hay uno (del usuario o nuestro)

    const final = this.o.carpetaInstalacion;
    const descargas = `${final}-descarga`;
    const preparacion = `${final}-instalando`; // se arma acá y recién al final pasa a `final`: nunca queda a medias
    await this.limpiar(descargas, preparacion);
    try {
      await mkdir(descargas, { recursive: true });
      await mkdir(preparacion, { recursive: true });

      const archivos: string[] = [];
      for (const p of paquetes) {
        const archivo = join(descargas, p.archivo);
        await this.descargarConRespaldo(p, archivo, alProgreso, senal);
        archivos.push(archivo);
      }

      alProgreso({ fase: 'instalando' });
      for (const [i, p] of paquetes.entries()) {
        await this.extraer(archivos[i]!, preparacion, p.formato, senal);
      }
      const exe = this.ejecutableEn(preparacion);
      if (!esArchivo(exe)) throw new Error('Se descomprimió el paquete pero no se encontró el ejecutable de Ollama.');
      await this.prepararEjecutable(exe, preparacion);

      await rm(final, { recursive: true, force: true });
      await renombrarConReintento(preparacion, final);
    } finally {
      await this.limpiar(descargas, preparacion);
    }
  }

  /** Borra el Ollama de la carpeta propia (no toca modelos ni el Ollama que el usuario ya tuviera). */
  async desinstalar(): Promise<void> {
    await rm(this.o.carpetaInstalacion, { recursive: true, force: true });
  }

  // --- paquetes y rutas por sistema ---------------------------------------------------------------------------

  private paquetes(): Paquete[] | null {
    const arch = this.arquitectura === 'x64' ? 'amd64' : this.arquitectura === 'arm64' ? 'arm64' : null;
    const rocm = this.o.conRocm === true;
    switch (this.plataforma) {
      case 'win32': {
        if (arch !== 'amd64') return null; // la documentación solo menciona el zip amd64
        const lista: Paquete[] = [{ archivo: 'ollama-windows-amd64.zip', formato: 'zip', principal: true }];
        if (rocm) lista.push({ archivo: 'ollama-windows-amd64-rocm.zip', formato: 'zip', principal: false });
        return lista;
      }
      case 'linux': {
        if (!arch) return null;
        const lista: Paquete[] = [{ archivo: `ollama-linux-${arch}.tar.zst`, formato: 'tar.zst', principal: true }];
        if (rocm && arch === 'amd64') lista.push({ archivo: 'ollama-linux-amd64-rocm.tar.zst', formato: 'tar.zst', principal: false });
        return lista;
      }
      case 'darwin':
        return [{ archivo: 'Ollama-darwin.zip', formato: 'zip', principal: true }]; // universal: Apple Silicon e Intel
      default:
        return null;
    }
  }

  private ejecutableEn(base: string): string {
    switch (this.plataforma) {
      case 'win32':
        return join(base, 'ollama.exe');
      case 'darwin':
        return join(base, 'Ollama.app', 'Contents', 'Resources', 'ollama');
      default:
        return join(base, 'bin', 'ollama');
    }
  }

  /** Dónde dejan Ollama los instaladores oficiales. Hace falta porque una app lanzada desde Finder/menú no hereda el PATH de la terminal. */
  private rutasConocidas(): string[] {
    switch (this.plataforma) {
      case 'win32': {
        const base = process.env.LOCALAPPDATA;
        return base ? [join(base, 'Programs', 'Ollama', 'ollama.exe')] : [];
      }
      case 'darwin':
        return [
          '/Applications/Ollama.app/Contents/Resources/ollama',
          join(homedir(), 'Applications', 'Ollama.app', 'Contents', 'Resources', 'ollama'),
          '/usr/local/bin/ollama',
          '/opt/homebrew/bin/ollama',
        ];
      default:
        return ['/usr/local/bin/ollama', '/usr/bin/ollama', '/bin/ollama'];
    }
  }

  private async limpiar(...carpetas: string[]): Promise<void> {
    for (const c of carpetas) await rm(c, { recursive: true, force: true }).catch(() => {});
  }

  /** Permiso de ejecución (Linux/macOS) y, en macOS, quita la marca de cuarentena por si el sistema la hubiera puesto. */
  private async prepararEjecutable(exe: string, carpeta: string): Promise<void> {
    if (this.plataforma === 'win32') return;
    await chmod(exe, 0o755);
    if (this.plataforma === 'darwin') {
      await ejecutar('xattr', ['-dr', 'com.apple.quarantine', join(carpeta, 'Ollama.app')]).catch(() => {});
    }
  }

  // --- descarga -----------------------------------------------------------------------------------------------

  private async descargarConRespaldo(
    p: Paquete,
    destino: string,
    alProgreso: (p: ProgresoInstalacion) => void,
    senal?: AbortSignal,
  ): Promise<void> {
    let ultimoError: unknown = new Error('No hay dirección de descarga configurada.');
    for (const url of (this.o.urlsDe ?? urlsPorDefecto)(p.archivo)) {
      try {
        await this.descargar(url, p, destino, alProgreso, senal);
        return;
      } catch (e) {
        if (senal?.aborted) throw e; // cancelado a propósito: no se prueba otra dirección
        ultimoError = e;
      }
    }
    throw ultimoError instanceof Error ? ultimoError : new Error(String(ultimoError));
  }

  private async descargar(
    url: string,
    p: Paquete,
    destino: string,
    alProgreso: (p: ProgresoInstalacion) => void,
    senal?: AbortSignal,
  ): Promise<void> {
    alProgreso({ fase: 'descargando', porcentaje: null });
    const r = await fetch(url, { signal: senal, redirect: 'follow' });
    if (!r.ok || !r.body) throw new Error(`No se pudo descargar Ollama (respuesta ${r.status}).`);

    const total = Number(r.headers.get('content-length')) || 0;
    const hash = createHash('sha256');
    let recibido = 0;
    let ultimoPct = -1;

    await pipeline(
      Readable.fromWeb(r.body as unknown as WebReadableStream),
      async function* (fuente: AsyncIterable<Buffer>) {
        for await (const trozo of fuente) {
          hash.update(trozo);
          recibido += trozo.length;
          if (total > 0) {
            const pct = Math.min(100, Math.floor((recibido / total) * 100));
            if (pct !== ultimoPct) {
              ultimoPct = pct;
              alProgreso({ fase: 'descargando', porcentaje: pct });
            }
          }
          yield trozo;
        }
      },
      createWriteStream(destino),
      senal ? { signal: senal } : {},
    );

    if (total > 0 && recibido !== total) throw new Error('La descarga de Ollama quedó incompleta.');
    if (!(await tieneFirma(destino, p.formato))) {
      throw new Error('Lo descargado no es un paquete de Ollama válido (¿una página de error?).');
    }
    const esperado = this.o.sha256?.trim().toLowerCase();
    if (p.principal && esperado && hash.digest('hex') !== esperado) {
      throw new Error('El paquete descargado no coincide con el SHA-256 esperado.');
    }
  }

  // --- extracción ---------------------------------------------------------------------------------------------

  private extraer(archivo: string, destino: string, formato: FormatoPaquete, senal?: AbortSignal): Promise<void> {
    if (this.o.extraer) return this.o.extraer(archivo, destino, formato, senal);
    return formato === 'zip' ? this.extraerZip(archivo, destino, senal) : extraerTarZst(archivo, destino, senal);
  }

  private async extraerZip(archivo: string, destino: string, senal?: AbortSignal): Promise<void> {
    if (this.plataforma === 'win32') {
      // El tar que trae Windows (bsdtar) abre zip. Se usa por ruta completa: si el PATH trae el tar de Git (GNU), no lee zip.
      const tarWindows = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe');
      return ejecutar(tarWindows, ['-xf', archivo, '-C', destino], senal);
    }
    try {
      return await ejecutar('unzip', ['-q', '-o', archivo, '-d', destino], senal); // es lo que usa el instalador oficial de Ollama en macOS
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      return ejecutar('ditto', ['-x', '-k', archivo, destino], senal); // viene con macOS
    }
  }
}

/** Los .tar.zst: zstd con zlib de Node (si ese Node lo trae) y el tar del sistema; si no, `tar --zstd` (pide zstd instalado). */
async function extraerTarZst(archivo: string, destino: string, senal?: AbortSignal): Promise<void> {
  const crearZstd = (zlib as unknown as { createZstdDecompress?: () => Transform }).createZstdDecompress;
  if (typeof crearZstd !== 'function') return ejecutar('tar', ['--zstd', '-xf', archivo, '-C', destino], senal);

  const hijo = spawn('tar', ['-xf', '-', '-C', destino], { stdio: ['pipe', 'ignore', 'pipe'], signal: senal });
  const salida = esperarSalida(hijo);
  // Si tar falla enseguida, la tubería se rompe con EPIPE: el error útil es el de tar, no ese.
  const volcado = pipeline(createReadStream(archivo), crearZstd(), hijo.stdin!, senal ? { signal: senal } : {});
  const [rSalida, rVolcado] = await Promise.allSettled([salida, volcado]);
  if (rSalida.status === 'rejected') throw rSalida.reason;
  if (rVolcado.status === 'rejected') throw rVolcado.reason;
}

function ejecutar(cmd: string, args: string[], senal?: AbortSignal): Promise<void> {
  const hijo = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'], signal: senal, windowsHide: true });
  return esperarSalida(hijo);
}

function esperarSalida(hijo: ReturnType<typeof spawn>): Promise<void> {
  return new Promise<void>((resolver, rechazar) => {
    let errores = '';
    hijo.stderr?.on('data', (d: Buffer) => {
      errores = (errores + d.toString()).slice(-500);
    });
    hijo.on('error', rechazar); // incluye ENOENT (comando inexistente) y cancelación
    hijo.on('close', (codigo) => {
      if (codigo === 0) resolver();
      else rechazar(new Error(`No se pudo descomprimir el paquete de Ollama (código ${codigo}). ${errores.trim()}`.trim()));
    });
  });
}

function esArchivo(ruta: string): boolean {
  try {
    return existsSync(ruta) && statSync(ruta).isFile();
  } catch {
    return false;
  }
}

/** En Windows un antivirus puede tener la carpeta tomada unos instantes: se reintenta antes de rendirse. */
async function renombrarConReintento(desde: string, hasta: string): Promise<void> {
  await mkdir(dirname(hasta), { recursive: true });
  for (let intento = 1; ; intento++) {
    try {
      return await rename(desde, hasta);
    } catch (e) {
      const codigo = (e as NodeJS.ErrnoException).code;
      if (intento >= 5 || (codigo !== 'EPERM' && codigo !== 'EBUSY' && codigo !== 'EACCES')) throw e;
      await dormir(400 * intento);
    }
  }
}

/** Los zip empiezan con "PK" y los zstd con 28 B5 2F FD. Descarta páginas HTML de error guardadas como si fueran el paquete. */
async function tieneFirma(ruta: string, formato: FormatoPaquete): Promise<boolean> {
  const f = await open(ruta, 'r');
  try {
    const { bytesRead, buffer } = await f.read(Buffer.alloc(4), 0, 4, 0);
    if (bytesRead < 4) return false;
    return formato === 'zip'
      ? buffer[0] === 0x50 && buffer[1] === 0x4b
      : buffer[0] === 0x28 && buffer[1] === 0xb5 && buffer[2] === 0x2f && buffer[3] === 0xfd;
  } finally {
    await f.close();
  }
}