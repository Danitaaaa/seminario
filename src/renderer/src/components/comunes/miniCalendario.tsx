import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Evento } from '../../types/eventos';
import type { Tarea } from '../../types/tareas';
import type { Meta } from '../../types/metas';
import { obtenerUsuarioId } from '../../../lib/sesion';
import '../../styles/miniCalendario.css';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const dosDigitos = (n: number) => String(n).padStart(2, '0');
const fechaISO = (anio: number, mes: number, dia: number) => `${anio}-${dosDigitos(mes + 1)}-${dosDigitos(dia)}`;

// Lo que hay en un día. En el inicio solo se marcan eventos; en un proyecto, también tareas y metas con fecha.
interface Marcas {
  eventos: number;
  tareas: number;
  metas: number;
}

const TIPOS: { clave: keyof Marcas; singular: string; plural: string }[] = [
  { clave: 'eventos', singular: 'evento', plural: 'eventos' },
  { clave: 'tareas', singular: 'tarea', plural: 'tareas' },
  { clave: 'metas', singular: 'meta', plural: 'metas' },
];

const describir = (m: Marcas) =>
  TIPOS.filter((t) => m[t.clave] > 0)
    .map((t) => `${m[t.clave]} ${m[t.clave] === 1 ? t.singular : t.plural}`)
    .join(' · ');

interface MiniCalendarioProps {
  // Con idProyecto muestra lo del proyecto y lleva a sus eventos; sin él, los eventos del usuario.
  idProyecto?: number;
}

export function MiniCalendario({ idProyecto }: MiniCalendarioProps) {
  const navigate = useNavigate();
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mesIndex, setMesIndex] = useState(hoy.getMonth());
  const [marcas, setMarcas] = useState<Map<number, Marcas>>(new Map());

  const inicio = new Date(anio, mesIndex, 1).getDay();
  const dias = new Date(anio, mesIndex + 1, 0).getDate();
  const diasMesAnterior = new Date(anio, mesIndex, 0).getDate();
  const diasMesSiguiente = 42 - inicio - dias;
  const rutaEventos = idProyecto ? `/proyectos/${idProyecto}/eventos` : '/eventos';

  useEffect(() => {
    const usuarioId = obtenerUsuarioId();
    if (!usuarioId) return;
    const desde = fechaISO(anio, mesIndex, 1);
    const hasta = fechaISO(anio, mesIndex, dias);
    const prefijoMes = desde.slice(0, 7);
    let vigente = true;

    Promise.all([
      window.api.listarEventos({ usuarioId, idProyecto, desde: `${desde}T00:00:00`, hasta: `${hasta}T23:59:59` }),
      idProyecto ? window.api.listarTareas({ idProyecto, idUsuario: usuarioId }) : Promise.resolve([] as Tarea[]),
      idProyecto ? window.api.listarMetas({ idProyecto, idUsuario: usuarioId, desde, hasta }) : Promise.resolve([] as Meta[]),
    ])
      .then(([eventos, tareas, metas]: [Evento[], Tarea[], Meta[]]) => {
        if (!vigente) return;
        const nuevas = new Map<number, Marcas>();
        const sumar = (dia: number, clave: keyof Marcas) => {
          const actual = nuevas.get(dia) ?? { eventos: 0, tareas: 0, metas: 0 };
          nuevas.set(dia, { ...actual, [clave]: actual[clave] + 1 });
        };
        for (const e of eventos) {
          const f = new Date(e.fecha);
          if (f.getFullYear() === anio && f.getMonth() === mesIndex) sumar(f.getDate(), 'eventos');
        }
        // Las fechas límite son AAAA-MM-DD: se comparan como texto para no correrse por la zona horaria.
        for (const t of tareas) if (t.fechaLimite?.startsWith(prefijoMes)) sumar(Number(t.fechaLimite.slice(8, 10)), 'tareas');
        for (const m of metas) if (m.fechaLimite?.startsWith(prefijoMes)) sumar(Number(m.fechaLimite.slice(8, 10)), 'metas');
        setMarcas(nuevas);
      })
      .catch(console.error);

    return () => {
      vigente = false;
    };
  }, [anio, mesIndex, idProyecto]);

  function cambiarMes(delta: number): void {
    const nuevo = new Date(anio, mesIndex + delta, 1);
    setAnio(nuevo.getFullYear());
    setMesIndex(nuevo.getMonth());
  }

  const esHoy = (dia: number) =>
    dia === hoy.getDate() && mesIndex === hoy.getMonth() && anio === hoy.getFullYear();

  const anios = Array.from({ length: 11 }, (_, i) => hoy.getFullYear() - 5 + i);

  return (
    <div>
      <div className="calendario">
        <div className="calendario__cabecera">
          <button type="button" className="calendario__flecha" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <select className="calendario__select" value={mesIndex} onChange={(e) => setMesIndex(Number(e.target.value))} aria-label="Mes">
            {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select className="calendario__select" value={anio} onChange={(e) => setAnio(Number(e.target.value))} aria-label="Año">
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button type="button" className="calendario__flecha" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="calendario__grilla">
          {DIAS_SEMANA.map((d, i) => <span key={i} className="calendario__dia-semana">{d}</span>)}

          {Array.from({ length: inicio }, (_, i) => (
            <span key={`a${i}`} className="calendario__dia-ajeno">{diasMesAnterior - inicio + i + 1}</span>
          ))}

          {Array.from({ length: dias }, (_, i) => {
            const dia = i + 1;
            const delDia = marcas.get(dia);
            const detalle = delDia ? describir(delDia) : '';
            return (
              <button
                key={dia}
                type="button"
                className={`calendario__dia${esHoy(dia) ? ' calendario__dia--hoy' : ''}`}
                title={detalle || undefined}
                aria-label={detalle ? `${dia}: ${detalle}` : String(dia)}
                onClick={() => navigate(rutaEventos, { state: { fecha: fechaISO(anio, mesIndex, dia) } })}
              >
                {dia}
                {delDia && (
                  <span className="calendario__puntos" aria-hidden="true">
                    {TIPOS.filter((t) => delDia[t.clave] > 0).map((t) => (
                      <span key={t.clave} className={`calendario__punto calendario__punto--${t.clave}`} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}

          {Array.from({ length: diasMesSiguiente }, (_, i) => (
            <span key={`s${i}`} className="calendario__dia-ajeno">{i + 1}</span>
          ))}
        </div>

        {idProyecto && (
          <ul className="calendario__leyenda">
            {TIPOS.map((t) => (
              <li key={t.clave}>
                <span className={`calendario__punto calendario__punto--${t.clave}`} aria-hidden="true" />
                {t.plural[0].toUpperCase() + t.plural.slice(1)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" className="calendario__link" onClick={() => navigate(rutaEventos)}>
        Ir a eventos →
      </button>
    </div>
  );
}
