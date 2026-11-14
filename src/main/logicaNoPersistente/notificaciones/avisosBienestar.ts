import type { CargaDelDia } from '../../logicaPersistente/gestionDeBienestar/entidades';
import type { CrearNotificacionDTO } from '../../logicaPersistente/gestionDeNotificaciones/dto';

// Cuándo Syntra recomienda bajar el ritmo. Solo avisa: no bloquea ni cambia nada.
export const MUCHAS_SESIONES = 4;
export const MUCHOS_MINUTOS_PLANIFICADOS = 5 * 60;
export const MUCHOS_MINUTOS_ESTUDIADOS = 4 * 60;

const dosCifras = (n: number) => String(n).padStart(2, '0');
const diaDe = (d: Date) => `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
const horas = (minutos: number) => {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

// Cada aviso sale una sola vez por día (la clave lleva la fecha).
export function avisosBienestar(usuarioId: number, carga: CargaDelDia, ahora: Date): CrearNotificacionDTO[] {
  const dia = diaDe(ahora);
  const avisos: CrearNotificacionDTO[] = [];

  if (carga.sesiones >= MUCHAS_SESIONES || carga.minutosPlanificados >= MUCHOS_MINUTOS_PLANIFICADOS) {
    avisos.push({
      usuarioId,
      tipo: 'sesion',
      titulo: 'Hoy planificaste mucho',
      mensaje: `Tenés ${carga.sesiones} ${carga.sesiones === 1 ? 'sesión' : 'sesiones'} (${horas(carga.minutosPlanificados)}). ` +
        'Te recomendamos no sumar más y pasar alguna a otro día para descansar.',
      clave: `bienestar:planificado:${dia}`,
    });
  }

  if (carga.minutosEstudiados >= MUCHOS_MINUTOS_ESTUDIADOS) {
    avisos.push({
      usuarioId,
      tipo: 'sesion',
      titulo: 'Tomate un descanso',
      mensaje: `Hoy ya estudiaste ${horas(carga.minutosEstudiados)}. Descansar también ayuda a recordar mejor.`,
      clave: `bienestar:estudiado:${dia}`,
    });
  }

  return avisos;
}
