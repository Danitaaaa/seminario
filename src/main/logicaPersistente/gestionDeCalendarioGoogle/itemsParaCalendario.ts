import { Persistencia } from '../../persistencia/persistencia';
import { ItemCalendario } from './entidades';

// Cuánto se copia a Google: lo pasado reciente y lo que viene.
const DIAS_ATRAS = 30;
const DIAS_ADELANTE = 365;
const DURACION_EVENTO_MIN = 60; // los eventos de Syntra no tienen hora de fin

// Colores de Google Calendar: 11 rojo, 6 naranja, 9 azul, 2 verde, 5 amarillo.
const COLOR_EVENTO: Record<string, string> = { Parciales: '11', Exámenes: '11', Entregas: '6', Trabajos: '6', Clases: '2' };

const mas = (fecha: Date, minutos: number) => new Date(fecha.getTime() + minutos * 60_000);
const conHora = (dia: Date, horaMin: string) => {
  const [h, m] = horaMin.split(':').map(Number);
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, m);
};
const lineas = (...partes: (string | null | undefined | false)[]) => partes.filter(Boolean).join('\n');
const PIE = 'Creado por Syntra. Los cambios se hacen en Syntra.';

// Lo que se copia al calendario de Google: eventos (propios y de proyectos), sesiones de estudio
// sin terminar, clases (se repiten cada semana) y metas con fecha límite.
export class ItemsParaCalendario {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(idUsuario: number, ahora: Date = new Date()): Promise<ItemCalendario[]> {
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - DIAS_ATRAS);
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + DIAS_ADELANTE);

    const [eventos, sesiones, clases, metas] = await Promise.all([
      this.persistencia.ejecutar(
        `SELECT e.id, e.titulo, e.descripcion, e.lugar, e.fecha, e.categoria, e.prioridad, p.nombre AS proyecto
           FROM eventos e LEFT JOIN proyectos p ON p.id_proyecto = e.id_proyecto
          WHERE (e.usuario_id = $1 OR e.id_proyecto IN (
                  SELECT id_proyecto FROM proyecto_miembros WHERE id_usuario = $1 AND fecha_baja IS NULL))
            AND e.fecha >= $2 AND e.fecha < $3`,
        [idUsuario, desde, hasta]
      ),
      this.persistencia.ejecutar(
        `SELECT s.id_sesion_estudio AS id, s.nombre, s.fecha_programada, s.duracion, m.nombre AS materia,
                (SELECT string_agg(t.nombre, ', ') FROM sesion_estudio_metodo_estudio sm
                   JOIN tipo_metodo_estudio t ON t.id_tipo_metodo_estudio = sm.id_tipo_metodo_estudio
                  WHERE sm.id_sesion_estudio = s.id_sesion_estudio) AS metodos,
                (SELECT string_agg('- ' || o.descripcion, E'\\n' ORDER BY o.orden) FROM objetivo_sesion o
                  WHERE o.id_sesion_estudio = s.id_sesion_estudio) AS objetivos
           FROM sesion_estudio s JOIN materia m ON m.id_materia = s.id_materia
          WHERE s.id_usuario = $1 AND s.estado IN ('sin_empezar', 'en_curso')
            AND s.fecha_programada >= $2 AND s.fecha_programada < $3`,
        [idUsuario, desde, hasta]
      ),
      this.persistencia.ejecutar(
        `SELECT id, dia_semana, hora_inicio, hora_fin, titulo FROM horarios_cursado WHERE usuario_id = $1`,
        [idUsuario]
      ),
      this.persistencia.ejecutar(
        `SELECT id_meta AS id, titulo, descripcion, fecha_limite FROM metas
          WHERE id_usuario = $1 AND NOT completada AND fecha_limite IS NOT NULL AND fecha_limite >= $2::date AND fecha_limite < $3::date`,
        [idUsuario, desde, hasta]
      ),
    ]);

    const items: ItemCalendario[] = [];

    for (const e of eventos) {
      const inicio = new Date(e.fecha);
      items.push({
        clave: `ev${e.id}`,
        titulo: e.titulo,
        descripcion: lineas(
          `${e.categoria}${e.prioridad === 'importante' ? ' · importante' : ''}`,
          e.proyecto && `Proyecto: ${e.proyecto}`,
          e.descripcion,
          '',
          PIE
        ),
        lugar: e.lugar ?? undefined,
        inicio,
        fin: mas(inicio, DURACION_EVENTO_MIN),
        color: COLOR_EVENTO[e.categoria],
      });
    }

    for (const s of sesiones) {
      const inicio = new Date(s.fecha_programada);
      items.push({
        clave: `se${s.id}`,
        titulo: `Estudiar ${s.materia}: ${s.nombre}`,
        descripcion: lineas(
          'Sesión de estudio',
          s.metodos && `Métodos: ${s.metodos}`,
          s.objetivos && `Objetivos:\n${s.objetivos}`,
          '',
          PIE
        ),
        inicio,
        fin: mas(inicio, s.duracion),
        color: '9',
      });
    }

    // Clases: la primera es la de esta semana (aunque ya haya pasado) y se repite cada semana.
    const inicioSemana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - hoy.getDay());
    for (const c of clases) {
      const dia = new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() + c.dia_semana);
      items.push({
        clave: `cl${c.id}`,
        titulo: c.titulo,
        descripcion: lineas('Clase (horario de cursado)', '', PIE),
        inicio: conHora(dia, c.hora_inicio),
        fin: conHora(dia, c.hora_fin),
        semanal: true,
        color: '2',
      });
    }

    for (const m of metas) {
      const dia = new Date(m.fecha_limite);
      items.push({
        clave: `me${m.id}`,
        titulo: `Meta: ${m.titulo}`,
        descripcion: lineas('Vence hoy', m.descripcion, '', PIE),
        inicio: dia,
        fin: new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1),
        todoElDia: true,
        color: '5',
      });
    }

    return items;
  }
}
