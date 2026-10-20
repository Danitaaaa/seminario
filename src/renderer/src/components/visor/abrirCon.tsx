// Las dos formas de abrir un archivo fuera de la app.
export type DestinoExterno = 'microsoft' | 'google';

export const OPCIONES_ABRIR_CON: { destino: DestinoExterno; etiqueta: string; detalle: string }[] = [
  { destino: 'microsoft', etiqueta: 'Microsoft Office', detalle: 'Word, Excel o PowerPoint instalados' },
  { destino: 'google', etiqueta: 'Google Docs', detalle: 'Próximamente' },
];

export const AVISO_GOOGLE = 'La integración con Google Docs todavía no está disponible.';

// Google todavía no está conectado: no llama al main, solo deja que se muestre el aviso.
export function abrirCon(id: number, destino: DestinoExterno): Promise<void> {
  return destino === 'google' ? Promise.resolve() : window.api.abrirExterno({ id });
}