import JSZip from 'jszip';

// Un documento y su plantilla solo se diferencian en el tipo de la parte principal,
// declarado en [Content_Types].xml. [tipo del documento común, tipo de la plantilla]
const TIPO_PRINCIPAL: Record<string, [string, string]> = {
  dotx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml',
  ],
  xltx: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml',
  ],
  potx: [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml',
    'application/vnd.openxmlformats-officedocument.presentationml.template.main+xml',
  ],
};

// Si la extensión es de plantilla, convierte el documento que devolvió Drive en plantilla.
// Para cualquier otra extensión lo devuelve sin tocar.
export async function aPlantilla(contenido: Buffer, extension: string): Promise<Buffer> {
  const tipos = TIPO_PRINCIPAL[extension.toLowerCase()];
  if (!tipos) return contenido;

  const zip = await JSZip.loadAsync(contenido);
  const tiposDeContenido = zip.file('[Content_Types].xml');
  if (!tiposDeContenido) {
    throw new Error('El archivo que devolvió Drive no es un documento de Office válido.');
  }

  const xml = await tiposDeContenido.async('string');
  zip.file('[Content_Types].xml', xml.split(tipos[0]).join(tipos[1]));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}