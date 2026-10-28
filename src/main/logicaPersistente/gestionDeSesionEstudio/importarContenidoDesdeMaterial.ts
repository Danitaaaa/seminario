import { Persistencia } from '../../persistencia/persistencia';

// Máximo de pestañas por sesión (igual que en GestionarPestanas).
const MAXIMO_PESTANAS = 12;
// Largo máximo del título de una pestaña (columna titulo VARCHAR(60)).
const LARGO_TITULO = 60;

interface Seccion {
  titulo: string;
  contenido: string;
}

interface FilaPestana {
  id_pestana: number;
  titulo: string;
}

export class ImportarContenidoDesdeMaterial {
  constructor(private readonly persistencia: Persistencia) {}

  // Devuelve true si el archivo pertenecía a una sesión y se actualizó.
  async ejecutar(idArchivo: number, html: string): Promise<boolean> {
    const sesiones = await this.persistencia.ejecutar<{ id_sesion_estudio: number }>(
      `UPDATE sesion_estudio SET contenido = $2
        WHERE id_archivo = $1
        RETURNING id_sesion_estudio`,
      [idArchivo, html]
    );
    if (sesiones.length === 0) return false; // El Word no es de ninguna sesión.
    const idSesion = sesiones[0].id_sesion_estudio;

    const pestanas = await this.persistencia.ejecutar<FilaPestana>(
      `SELECT id_pestana, titulo FROM pestana_sesion
        WHERE id_sesion_estudio = $1
        ORDER BY orden, id_pestana`,
      [idSesion]
    );

    // Una sola pestaña (o ninguna): el documento entero es su contenido.
    if (pestanas.length <= 1) {
      await this.reemplazarPestanas(idSesion, pestanas, [{ titulo: pestanas[0]?.titulo ?? 'Pestaña 1', contenido: html }]);
      return true;
    }

    const secciones = this.separarPorTitulos(html);
    if (secciones.length === pestanas.length) {
      for (let i = 0; i < pestanas.length; i++) {
        await this.persistencia.ejecutar(
          `UPDATE pestana_sesion
              SET titulo = $2, contenido = $3, fecha_modificacion = now()
            WHERE id_pestana = $1`,
          [pestanas[i].id_pestana, secciones[i].titulo || pestanas[i].titulo, secciones[i].contenido]
        );
      }
      return true;
    }

    // La estructura cambió en el Word: las pestañas pasan a ser las secciones del documento.
    await this.reemplazarPestanas(
      idSesion,
      pestanas,
      secciones.length > 0 ? secciones : [{ titulo: pestanas[0].titulo, contenido: html }]
    );
    return true;
  }

  // Corta el HTML en secciones, una por cada <h1>. Lo que haya antes del primer título
  // se suma al comienzo de la primera sección.
  private separarPorTitulos(html: string): Seccion[] {
    const regex = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
    const titulos = [...html.matchAll(regex)];
    if (titulos.length === 0) return [];

    const antes = html.slice(0, titulos[0].index).trim();
    return titulos.map((t, i) => {
      const desde = (t.index ?? 0) + t[0].length;
      const hasta = i + 1 < titulos.length ? titulos[i + 1].index : html.length;
      let contenido = html.slice(desde, hasta).trim();
      if (i === 0 && antes) contenido = antes + contenido;
      return { titulo: this.textoPlano(t[1]), contenido };
    });
  }

  // Deja las pestañas de la sesión iguales a las secciones: actualiza las que ya existen,
  // crea las que faltan y borra las que sobran. Más de 12 secciones se juntan en la última.
  private async reemplazarPestanas(idSesion: number, actuales: FilaPestana[], secciones: Seccion[]): Promise<void> {
    const finales = secciones.slice(0, MAXIMO_PESTANAS);
    if (secciones.length > MAXIMO_PESTANAS) {
      const ultima = finales[MAXIMO_PESTANAS - 1];
      ultima.contenido += secciones
        .slice(MAXIMO_PESTANAS)
        .map((s) => `<h1>${this.escaparHtml(s.titulo)}</h1>${s.contenido}`)
        .join('');
    }

    for (let i = 0; i < finales.length; i++) {
      const titulo = (finales[i].titulo || `Pestaña ${i + 1}`).slice(0, LARGO_TITULO);
      if (i < actuales.length) {
        await this.persistencia.ejecutar(
          `UPDATE pestana_sesion
              SET titulo = $2, contenido = $3, orden = $4, fecha_modificacion = now()
            WHERE id_pestana = $1`,
          [actuales[i].id_pestana, titulo, finales[i].contenido, i]
        );
      } else {
        await this.persistencia.ejecutar(
          `INSERT INTO pestana_sesion (id_sesion_estudio, titulo, contenido, orden)
           VALUES ($1, $2, $3, $4)`,
          [idSesion, titulo, finales[i].contenido, i]
        );
      }
    }

    const sobrantes = actuales.slice(finales.length).map((p) => p.id_pestana);
    if (sobrantes.length > 0) {
      await this.persistencia.ejecutar(`DELETE FROM pestana_sesion WHERE id_pestana = ANY($1::int[])`, [sobrantes]);
    }
  }

  // Texto de un título sin etiquetas ni entidades HTML ("Tema &amp; repaso" → "Tema & repaso").
  private textoPlano(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .trim()
      .slice(0, LARGO_TITULO);
  }

  private escaparHtml(texto: string): string {
    return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}