import { Persistencia } from '../../persistencia/persistencia';
import { ResumenSesionesEstudio } from './entidades';
import { ResumenSesionesDTO } from './dto';
import { SELECT_SESION_ESTUDIO } from './consultas';
import { materializarSesionEstudio } from './materializador';

// Devuelve el nombre del usuario y su próxima sesión sin empezar (la más cercana desde ahora).
// Lo usan el cartel de bienvenida de la lista y la tarjeta "Próxima sesión" dentro de una sesión.
export class ObtenerResumenSesiones {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, datos: ResumenSesionesDTO): Promise<ResumenSesionesEstudio> {
    const [usuarios, proximas] = await Promise.all([
      this.persistencia.ejecutar(`SELECT nombre FROM usuarios WHERE id_usuario = $1`, [idUsuario]),
      this.persistencia.ejecutar(
        `${SELECT_SESION_ESTUDIO}
          WHERE s.id_usuario = $1
            AND s.estado = 'sin_empezar'
            AND s.fecha_programada + make_interval(mins => s.duracion) >= now()
            AND ($2::int IS NULL OR s.id_sesion_estudio <> $2)
          ORDER BY s.fecha_programada, s.id_sesion_estudio
          LIMIT 1`,
        [idUsuario, datos.excluirIdSesion ?? null]
      ),
    ]);

    return {
      nombreUsuario: usuarios[0]?.nombre ?? '',
      proximaSesion: proximas.length === 0 ? null : materializarSesionEstudio(proximas[0]),
    };
  }
}
