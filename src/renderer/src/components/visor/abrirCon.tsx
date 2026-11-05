// Las formas de abrir un archivo fuera de la app.
export type DestinoExterno = 'microsoft' | 'google';

export const OPCIONES_ABRIR_CON: { destino: DestinoExterno; etiqueta: string; detalle: string }[] = [
  { destino: 'microsoft', etiqueta: 'Microsoft Office', detalle: 'Word, Excel o PowerPoint instalados' },
  { destino: 'google', etiqueta: 'Google Docs', detalle: 'Sube una copia a Google y la abre en el navegador' },
];

// Fotos, videos y audios no se abren con Office ni con Google Docs: van con las apps del sistema.
const MULTIMEDIA = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'tif', 'tiff', 'heic', 'ico',
  'mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'ogg', 'm4a', 'flac',
]);
export const esMultimedia = (extension: string) => MULTIMEDIA.has(extension.toLowerCase());

// Microsoft abre el archivo local. Google sube la copia a Drive (la primera vez) y la abre.
export function abrirCon(id: number, destino: DestinoExterno): Promise<void> {
  return destino === 'google'
    ? window.api.abrirEnDrive({ id })
    : window.api.abrirExterno({ id });
}