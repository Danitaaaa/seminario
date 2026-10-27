import carpetaSvg from '../assets/iconsFile1/folder.svg?raw';
import logoSrc from '../assets/logo-barra.png?inline';

// Colores con los que están dibujados los íconos originales, y el token de la paleta que los reemplaza.
const TOKENS_CARPETA: Record<string, string> = {
  '#8ba3c5': '--color-primary-light',
  '#495b7d': '--color-primary',
  '#02122f': '--color-primary-dark',
};

// Lee un token de color publicado por aplicarTema (issue.ts). Si no existe, usa el respaldo.
export function leerToken(nombre: string, respaldo: string): string {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  return valor || respaldo;
}

// Devuelve la carpeta dibujada con los colores de la paleta activa.
// Un solo reemplazo por expresión regular: así un color nuevo nunca vuelve a reemplazarse.
export function iconoCarpeta(): string {
  const svg = carpetaSvg.replace(/#(?:8ba3c5|495b7d|02122f)/gi, (color) => {
    const token = TOKENS_CARPETA[color.toLowerCase()];
    return token ? leerToken(token, color) : color;
  });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function aRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Recolorea una imagen del logo: la luminancia de cada píxel decide entre el color "oscuro"
// y el "claro" de la paleta, y se conserva la transparencia. Devuelve una imagen PNG en data URL.
// La imagen tiene que importarse con ?inline para que el canvas pueda leerla.
export function colorearLogo(claro: string, oscuro: string, origen: string = logoSrc): Promise<string> {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => {
      const lienzo = document.createElement('canvas');
      lienzo.width = imagen.naturalWidth;
      lienzo.height = imagen.naturalHeight;
      const ctx = lienzo.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo preparar el logo.'));
        return;
      }
      ctx.drawImage(imagen, 0, 0);
      const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
      const px = datos.data;
      const [r0, g0, b0] = aRgb(oscuro);
      const [r1, g1, b1] = aRgb(claro);
      const base = [r0, g0, b0];
      const tope = [r1, g1, b1];
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] === 0) continue;
        const luz = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
        for (let c = 0; c < 3; c++) px[i + c] = base[c] + (tope[c] - base[c]) * luz;
      }
      ctx.putImageData(datos, 0, 0);
      resolve(lienzo.toDataURL('image/png'));
    };
    imagen.onerror = () => reject(new Error('No se pudo cargar el logo.'));
    imagen.src = origen;
  });
}

export { logoSrc };