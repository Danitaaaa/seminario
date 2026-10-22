import { execFile, spawn } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);

export interface AplicacionSistema {
  id: string;
  nombre: string;
  comando: string;
}

async function consultar(argumentos: string[]): Promise<string> {
  try {
    const { stdout } = await ejecutar('reg', ['query', ...argumentos], { windowsHide: true });
    return stdout;
  } catch {
    return '';
  }
}

// Cada valor del registro sale como "    nombre    REG_SZ    dato".
function leerValores(salida: string): { nombre: string; dato: string }[] {
  return salida
    .split(/\r?\n/)
    .map((linea) => linea.match(/^\s+(.*?)\s{4}REG_\w+(?:\s{4}(.*))?$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ nombre: m[1], dato: (m[2] ?? '').trim() }));
}

async function valorPredeterminado(clave: string): Promise<string> {
  return leerValores(await consultar([clave, '/ve']))[0]?.dato ?? '';
}

async function subclaves(clave: string): Promise<string[]> {
  const propia = clave.split('\\').pop()!.toLowerCase();
  return (await consultar([clave]))
    .split(/\r?\n/)
    .filter((linea) => linea.startsWith('HKEY'))
    .map((linea) => linea.trim().split('\\').pop()!)
    .filter((nombre) => nombre.toLowerCase() !== propia);
}

// Reemplaza variables como %ProgramFiles%; no toca %1, que es el lugar del archivo.
const expandirEntorno = (texto: string) =>
  texto.replace(/%([A-Za-z_][\w()]*)%/g, (original, nombre) => process.env[nombre] ?? original);

// Separa un comando respetando las comillas.
const separar = (comando: string) =>
  [...comando.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2]);

async function nombreDe(ejecutable: string): Promise<string> {
  const base = path.basename(ejecutable);
  const amigable = leerValores(
    await consultar([`HKCR\\Applications\\${base}`, '/v', 'FriendlyAppName']),
  )[0]?.dato;
  if (amigable && !amigable.startsWith('@')) return amigable;
  return base.replace(/\.exe$/i, '');
}

// Aplicaciones que Windows ofrece en "Abrir con" para esa extensión.
export async function listarAplicaciones(extension: string): Promise<AplicacionSistema[]> {
  if (process.platform !== 'win32' || !/^[a-z0-9]+$/i.test(extension)) return [];

  const ext = `.${extension.toLowerCase()}`;
  const deUsuario = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\${ext}`;

  const ejecutables = new Set<string>([
    ...leerValores(await consultar([`${deUsuario}\\OpenWithList`]))
      .filter((v) => v.nombre !== 'MRUList')
      .map((v) => v.dato),
    ...(await subclaves(`HKCR\\${ext}\\OpenWithList`)),
  ]);

  const progids = new Set<string>(
    [
      await valorPredeterminado(`HKCR\\${ext}`),
      ...leerValores(await consultar([`${deUsuario}\\UserChoice`, '/v', 'ProgId'])).map((v) => v.dato),
      ...leerValores(await consultar([`HKCR\\${ext}\\OpenWithProgids`])).map((v) => v.nombre),
      ...leerValores(await consultar([`${deUsuario}\\OpenWithProgids`])).map((v) => v.nombre),
    ].filter((progid) => progid && !progid.startsWith('(')),
  );

  const comandos = [
    ...(await Promise.all(
      [...ejecutables].map((exe) => valorPredeterminado(`HKCR\\Applications\\${exe}\\shell\\open\\command`)),
    )),
    ...(await Promise.all(
      [...progids].map((progid) => valorPredeterminado(`HKCR\\${progid}\\shell\\open\\command`)),
    )),
  ];

  const porId = new Map<string, AplicacionSistema>();
  for (const comando of comandos) {
    const ejecutable = separar(expandirEntorno(comando))[0];
    if (!ejecutable || !/\.exe$/i.test(ejecutable)) continue;
    const id = path.basename(ejecutable).toLowerCase();
    if (!porId.has(id)) porId.set(id, { id, nombre: await nombreDe(ejecutable), comando });
  }
  return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function lanzar(ejecutable: string, argumentos: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proceso = spawn(ejecutable, argumentos, { detached: true, stdio: 'ignore' });
    proceso.once('error', reject);
    proceso.once('spawn', () => {
      proceso.unref();
      resolve();
    });
  });
}

// Arma los argumentos sin pasar por una shell: la ruta va como argumento, nunca concatenada.
export function abrirConAplicacion(aplicacion: AplicacionSistema, ruta: string): Promise<void> {
  const [ejecutable, ...resto] = separar(expandirEntorno(aplicacion.comando));
  let rutaIncluida = false;
  const argumentos = resto
    .filter((argumento) => argumento !== '%*')
    .map((argumento) => {
      if (!/%[1lLvV]/.test(argumento)) return argumento;
      rutaIncluida = true;
      return argumento.replace(/%[1lLvV]/g, ruta);
    });
  if (!rutaIncluida) argumentos.push(ruta);
  return lanzar(ejecutable, argumentos);
}

// Diálogo nativo de Windows "¿Cómo querés abrir este archivo?".
export function elegirOtraAplicacion(ruta: string): Promise<void> {
  return lanzar('rundll32.exe', ['shell32.dll,OpenAs_RunDLL', ruta]);
}