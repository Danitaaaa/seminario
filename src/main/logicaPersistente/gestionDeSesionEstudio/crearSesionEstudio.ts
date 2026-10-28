import { Persistencia } from '../../persistencia/persistencia';
import { SesionEstudio } from './entidades';
import { CrearSesionEstudioDTO } from './dto';
import { SELECT_SESION_ESTUDIO } from './consultas';
import { materializarSesionEstudio } from './materializador';
import { exigirMazoPropio } from './mazoDeSesion';
import { DocumentoSesionEstudio } from '../../logicaNoPersistente/procesoSesionEstudio/documentoSesionEstudio';

// Crea una sesión de estudio (CU11) junto con sus métodos, metas y su primera pestaña
// en una sola sentencia atómica. La sesión nace "sin_empezar" y se le genera su documento Word en Material.
export class CrearSesionEstudio {
  constructor(
    private readonly persistencia: Persistencia,
    private readonly documento: DocumentoSesionEstudio
  ) {}

  async ejecutar(idUsuario: number, datos: CrearSesionEstudioDTO): Promise<SesionEstudio> {
    // Se eliminan métodos repetidos para no violar la clave primaria de la tabla intermedia.
    const idsMetodos = [...new Set(datos.idsMetodosEstudio)];
    await exigirMazoPropio(this.persistencia, idUsuario, datos.idDeck);

    const creada = await this.persistencia.ejecutar(
      `WITH nueva AS (
         INSERT INTO sesion_estudio
           (id_usuario, id_materia, nombre, duracion, fecha_programada,
            pomodoro_min, descanso_corto_min, descanso_largo_min, recibir_notificacion, id_deck)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $12)
         RETURNING id_sesion_estudio
       ), metodos AS (
         INSERT INTO sesion_estudio_metodo_estudio (id_sesion_estudio, id_tipo_metodo_estudio)
         SELECT nueva.id_sesion_estudio, m FROM nueva, unnest($10::int[]) AS m
       ), metas AS (
         INSERT INTO objetivo_sesion (id_sesion_estudio, descripcion, orden)
         SELECT nueva.id_sesion_estudio, o.descripcion, (o.orden - 1)::int
           FROM nueva, unnest($11::text[]) WITH ORDINALITY AS o(descripcion, orden)
       ), pestana AS (
         INSERT INTO pestana_sesion (id_sesion_estudio, titulo, orden)
         SELECT nueva.id_sesion_estudio, 'Pestaña 1', 0 FROM nueva
       )
       SELECT id_sesion_estudio FROM nueva`,
      [
        idUsuario,
        datos.idMateria,
        datos.nombre,
        datos.duracion,
        datos.fechaProgramada,
        datos.pomodoroMin,
        datos.descansoCortoMin,
        datos.descansoLargoMin,
        datos.recibirNotificacion,
        idsMetodos,
        datos.metas,
        datos.idDeck ?? null,
      ]
    );

    const idSesion: number = creada[0].id_sesion_estudio;

    // Si falla el documento la sesión igual queda creada; se genera al primer guardado del contenido.
    try {
      const archivo = await this.documento.crear(datos.nombre, '');
      await this.persistencia.ejecutar(
        `UPDATE sesion_estudio SET id_archivo = $1 WHERE id_sesion_estudio = $2`,
        [archivo.id, idSesion]
      );
    } catch (error) {
      console.error('[CrearSesionEstudio] No se pudo crear el documento Word:', error);
    }

    const filas = await this.persistencia.ejecutar(
      `${SELECT_SESION_ESTUDIO} WHERE s.id_sesion_estudio = $1`,
      [idSesion]
    );
    return materializarSesionEstudio(filas[0]);
  }
}
