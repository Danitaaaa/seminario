import type { LadoDrive } from '../../types/archivo';

// Las formas de abrir un archivo fuera de la app.
export type DestinoExterno = 'microsoft' | 'google';

export const OPCIONES_ABRIR_CON: { destino: DestinoExterno; etiqueta: string; detalle: string }[] = [
  { destino: 'microsoft', etiqueta: 'Microsoft Office', detalle: 'Word, Excel o PowerPoint instalados' },
  { destino: 'google', etiqueta: 'Google Docs', detalle: 'Lo abre en Google con los últimos cambios de Syntra' },
];

// Fotos, videos y audios no se abren con Office ni con Google Docs: van con las apps del sistema.
const MULTIMEDIA = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'tif', 'tiff', 'heic', 'ico',
  'mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'ogg', 'm4a', 'flac',
]);
export const esMultimedia = (extension: string) => MULTIMEDIA.has(extension.toLowerCase());

// Microsoft abre el archivo local. Google sube a Drive lo que cambió en Syntra y lo abre;
// devuelve 'conflicto' si también cambió en Google (hay que elegir con `conservar`).
export async function abrirCon(id: number, destino: DestinoExterno, conservar?: LadoDrive): Promise<'abierto' | 'conflicto'> {
  if (destino === 'google') return window.api.abrirEnDrive({ id, conservar });
  await window.api.abrirExterno({ id });
  return 'abierto';
}
