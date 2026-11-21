import { extraerMensajeError } from '../pages/sesionesEstudio/utilidades';

interface Avisos {
  exito: (mensaje: string) => void;
  error: (mensaje: string) => void;
}

// Descarga uno o varios archivos de Syntra a la compu y avisa cómo salió.
// Con uno pregunta dónde guardarlo; con varios, en qué carpeta. Cancelar no avisa nada.
export async function descargarArchivos(ids: number[], avisos: Avisos): Promise<void> {
  if (ids.length === 0) return;
  try {
    const resultado = await window.api.descargarArchivos({ ids });
    if (!resultado) return;
    const { copiados, fallidos, destino } = resultado;
    if (copiados === 0) return avisos.error('No se pudo descargar ningún archivo.');
    if (ids.length === 1) avisos.exito(`Descargado: ${destino}`);
    else avisos.exito(`Se descargaron ${copiados} archivos en ${destino}.`);
    if (fallidos > 0) avisos.error(`${fallidos} archivo${fallidos > 1 ? 's no se pudieron' : ' no se pudo'} descargar.`);
  } catch (e) {
    avisos.error(extraerMensajeError(e, 'No se pudo descargar.'));
  }
}
