// Las formas de abrir un archivo fuera de la app.
export type DestinoExterno = 'microsoft' | 'google';

export const OPCIONES_ABRIR_CON: { destino: DestinoExterno; etiqueta: string; detalle: string }[] = [
  { destino: 'microsoft', etiqueta: 'Microsoft Office', detalle: 'Word, Excel o PowerPoint instalados' },
  { destino: 'google', etiqueta: 'Google Docs', detalle: 'Sube una copia a Google y la abre en el navegador' },
];

// Microsoft abre el archivo local. Google sube la copia a Drive (la primera vez) y la abre.
export function abrirCon(id: number, destino: DestinoExterno): Promise<void> {
  return destino === 'google'
    ? window.api.abrirEnDrive({ id })
    : window.api.abrirExterno({ id });
}