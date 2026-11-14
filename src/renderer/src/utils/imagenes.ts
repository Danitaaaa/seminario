// src/renderer/src/utils/imagenes.ts
// Pasar una imagen (foto, captura, archivo pegado) a JPEG en base64, achicada, para mandársela a la IA.
// Las fotos del celular pesan varios MB: achicarlas hace que la IA responda más rápido y que se guarden livianas.

export const TIPOS_IMAGEN_ACEPTADOS = 'image/png,image/jpeg,image/webp,image/gif,image/bmp';

/** Quita el "data:image/...;base64," del principio. */
export const sinPrefijoDataUrl = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1);

/** De base64 (JPEG) a algo que se puede poner en un <img src>. */
export const imagenComoSrc = (base64: string) =>
  `data:${base64.startsWith('iVBOR') ? 'image/png' : 'image/jpeg'};base64,${base64}`;

/** La imagen como JPEG en base64 (sin prefijo), con el lado más largo de `maxLado` píxeles como mucho. */
export async function imagenAJpeg(imagenArchivo: Blob, maxLado = 2000, calidad = 0.85): Promise<string> {
  const url = URL.createObjectURL(imagenArchivo);
  try {
    const imagen = new Image();
    await new Promise<void>((resolver, rechazar) => {
      imagen.onload = () => resolver();
      imagen.onerror = () => rechazar(new Error('No se pudo leer la imagen.'));
      imagen.src = url;
    });
    const escala = Math.min(1, maxLado / Math.max(imagen.naturalWidth, imagen.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
    const contexto = canvas.getContext('2d');
    if (!contexto) throw new Error('No se pudo preparar la imagen.');
    contexto.fillStyle = '#ffffff'; // el JPEG no tiene transparencia
    contexto.fillRect(0, 0, canvas.width, canvas.height);
    contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
    return sinPrefijoDataUrl(canvas.toDataURL('image/jpeg', calidad));
  } finally {
    URL.revokeObjectURL(url);
  }
}
