import type { Persistencia } from '../../persistencia/persistencia';
import type { CambioTraido, CambioDeGoogle } from './entidades';

const MAX_TITULO = 200; // mismos límites que al crear un evento en Syntra
const MAX_LUGAR = 200;
const MAX_DURACION_SESION = 720;

// Pasa a Syntra lo que se cambió en Google de un evento personal o de una sesión de estudio.
// Los eventos de proyectos no se tocan (son de todo el equipo): esos se vuelven a subir como están en Syntra.
// Una sesión solo se mueve si no se pisa con otra.
export class AplicarCambiosDeGoogle {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, cambios: CambioDeGoogle[]): Promise<CambioTraido[]> {
    const traidos: CambioTraido[] = [];
    for (const cambio of cambios) {
      const id = Number(cambio.clave.slice(2));
      const traido = cambio.clave.startsWith('ev')
        ? await this.evento(idUsuario, id, cambio)
        : await this.sesion(idUsuario, id, cambio);
      if (traido) traidos.push(traido);
    }
    return traidos;
  }

  private async evento(idUsuario: number, id: number, cambio: CambioDeGoogle): Promise<CambioTraido | null> {
    const [antes] = await this.persistencia.ejecutar<{ titulo: string; fecha: Date }>(
      `SELECT titulo, fecha FROM eventos WHERE id = $1 AND usuario_id = $2 AND id_proyecto IS NULL`,
      [id, idUsuario],
    );
    if (!antes) return null;
    await this.persistencia.ejecutar(
      `UPDATE eventos SET titulo = $3, fecha = $4, lugar = $5 WHERE id = $1 AND usuario_id = $2`,
      [id, idUsuario, cambio.titulo.slice(0, MAX_TITULO), cambio.inicio, cambio.lugar?.slice(0, MAX_LUGAR) ?? null],
    );
    return { clave: cambio.clave, titulo: cambio.titulo.slice(0, MAX_TITULO), antes: new Date(antes.fecha).toISOString(), ahora: cambio.inicio.toISOString() };
  }

  private async sesion(idUsuario: number, id: number, cambio: CambioDeGoogle): Promise<CambioTraido | null> {
    const duracion = Math.round((cambio.fin.getTime() - cambio.inicio.getTime()) / 60_000);
    if (duracion < 1 || duracion > MAX_DURACION_SESION) return null;

    const [antes] = await this.persistencia.ejecutar<{ nombre: string; fecha_programada: Date }>(
      `SELECT nombre, fecha_programada FROM sesion_estudio
        WHERE id_sesion_estudio = $1 AND id_usuario = $2 AND estado IN ('sin_empezar', 'atrasada')`,
      [id, idUsuario],
    );
    if (!antes) return null; // ya empezó o terminó: no se reprograma

    const pisadas = await this.persistencia.ejecutar(
      `SELECT 1 FROM sesion_estudio
        WHERE id_usuario = $1 AND id_sesion_estudio <> $2 AND estado <> 'completada'
          AND fecha_programada < $3::timestamptz + make_interval(mins => $4::int)
          AND fecha_programada + make_interval(mins => duracion) > $3::timestamptz
        LIMIT 1`,
      [idUsuario, id, cambio.inicio, duracion],
    );
    if (pisadas.length > 0) return null;

    await this.persistencia.ejecutar(
      `UPDATE sesion_estudio
          SET fecha_programada = $3, duracion = $4,
              estado = CASE WHEN estado = 'atrasada' AND $3::timestamptz + make_interval(mins => $4::int) >= now()
                            THEN 'sin_empezar' ELSE estado END
        WHERE id_sesion_estudio = $1 AND id_usuario = $2`,
      [id, idUsuario, cambio.inicio, duracion],
    );
    return { clave: cambio.clave, titulo: antes.nombre, antes: new Date(antes.fecha_programada).toISOString(), ahora: cambio.inicio.toISOString() };
  }
}
