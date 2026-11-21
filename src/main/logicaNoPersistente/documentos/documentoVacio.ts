import HTMLtoDOCX from '@turbodocx/html-to-docx';

export type TipoDocumentoNuevo = 'docx' | 'txt';

// Bytes de un documento vacío, listo para guardarlo en Material y abrirlo en el editor.
export async function documentoVacio(tipo: TipoDocumentoNuevo): Promise<Buffer> {
  if (tipo === 'txt') return Buffer.from('', 'utf8');
  return (await HTMLtoDOCX('<p></p>', null, {})) as Buffer;
}
