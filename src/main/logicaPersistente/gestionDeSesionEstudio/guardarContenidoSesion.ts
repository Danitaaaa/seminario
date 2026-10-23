import { Persistencia } from '../../persistencia/persistencia';
import { GuardarContenidoSesionDTO } from './dto';
import { DocumentoSesionEstudio } from '../../logicaNoPersistente/procesoSesionEstudio/documentoSesionEstudio';

// Guarda el contenido del editor en la sesión y lo refleja en su archivo Word de Material.
// Si la sesión todavía no tiene archivo (falló al crearla o se borró), lo crea.
export class GuardarContenidoSesion {
  constructor(
    private readonly persistencia: Persistencia,
    private readonly documento: DocumentoSesionEstudio
  ) {}

  async ejecutar(idUsuario: number, datos: GuardarContenidoSesionDTO): Promise<void> {
    const guardadas = await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET contenido = $3, fecha_ultimo_acceso = now()
        WHERE id_sesion_estudio = $1 AND id_usuario = $2
        RETURNING nombre, id_archivo`,
      [datos.idSesion, idUsuario, datos.contenido]
    );
    if (guardadas.length === 0) {
      throw new Error('La sesión de estudio no existe.');
    }

    const { nombre, id_archivo: idArchivo } = guardadas[0];
    if (idArchivo === null) {
      const archivo = await this.documento.crear(nombre, datos.contenido);
      await this.persistencia.ejecutar(
        `UPDATE sesion_estudio SET id_archivo = $1 WHERE id_sesion_estudio = $2`,
        [archivo.id, datos.idSesion]
      );
      return;
    }
    await this.documento.actualizar(idArchivo, datos.contenido);
  }
}
