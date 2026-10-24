import { Persistencia } from '../../persistencia/persistencia';
import { GuardarContenidoSesionDTO } from './dto';
import { PestanaSesion } from './entidades';
import { materializarPestana } from './materializador';
import { DocumentoSesionEstudio } from '../../logicaNoPersistente/procesoSesionEstudio/documentoSesionEstudio';

// Guarda el contenido de una pestaña y refleja la sesión completa en su archivo Word de Material.
// El Word lleva todas las pestañas en orden (cada una con su título si hay más de una).
// Si la sesión todavía no tiene archivo (falló al crearla o se borró), lo crea.
export class GuardarContenidoSesion {
  constructor(
    private readonly persistencia: Persistencia,
    private readonly documento: DocumentoSesionEstudio
  ) {}

  async ejecutar(idUsuario: number, datos: GuardarContenidoSesionDTO): Promise<PestanaSesion> {
    const guardadas = await this.persistencia.ejecutar(
      `UPDATE pestana_sesion p
          SET contenido = $4, fecha_modificacion = now()
         FROM sesion_estudio s
        WHERE p.id_pestana = $1
          AND p.id_sesion_estudio = $2
          AND s.id_sesion_estudio = p.id_sesion_estudio
          AND s.id_usuario = $3
       RETURNING p.*`,
      [datos.idPestana, datos.idSesion, idUsuario, datos.contenido]
    );
    if (guardadas.length === 0) {
      throw new Error('La pestaña de la sesión no existe.');
    }

    await this.sincronizar(idUsuario, datos.idSesion);
    return materializarPestana(guardadas[0]);
  }

  // Arma el documento completo con todas las pestañas, lo guarda en la sesión y actualiza el Word.
  // Se llama también al crear, renombrar o eliminar una pestaña.
  async sincronizar(idUsuario: number, idSesion: number): Promise<void> {
    const pestanas = await this.persistencia.ejecutar<{ titulo: string; contenido: string }>(
      `SELECT p.titulo, p.contenido
         FROM pestana_sesion p
         JOIN sesion_estudio s ON s.id_sesion_estudio = p.id_sesion_estudio
        WHERE p.id_sesion_estudio = $1 AND s.id_usuario = $2
        ORDER BY p.orden, p.id_pestana`,
      [idSesion, idUsuario]
    );
    const html = this.armarDocumento(pestanas);

    const guardadas = await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET contenido = $3, fecha_ultimo_acceso = now()
        WHERE id_sesion_estudio = $1 AND id_usuario = $2
        RETURNING nombre, id_archivo`,
      [idSesion, idUsuario, html]
    );
    if (guardadas.length === 0) {
      throw new Error('La sesión de estudio no existe.');
    }

    const { nombre, id_archivo: idArchivo } = guardadas[0];
    if (idArchivo === null) {
      const archivo = await this.documento.crear(nombre, html);
      await this.persistencia.ejecutar(
        `UPDATE sesion_estudio SET id_archivo = $1 WHERE id_sesion_estudio = $2`,
        [archivo.id, idSesion]
      );
      return;
    }
    await this.documento.actualizar(idArchivo, html);
  }

  // Con una sola pestaña el Word queda igual que antes; con varias, cada una va bajo su título.
  private armarDocumento(pestanas: { titulo: string; contenido: string }[]): string {
    if (pestanas.length <= 1) return pestanas[0]?.contenido ?? '';
    return pestanas
      .map((p) => `<h1>${this.escaparHtml(p.titulo)}</h1>${p.contenido || '<p></p>'}`)
      .join('');
  }

  private escaparHtml(texto: string): string {
    return texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
