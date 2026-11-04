import type { EstadoMateria, MateriaFormacion } from '../../types/materias';

const PARTES: { estado: EstadoMateria; singular: string; plural: string }[] = [
  { estado: 'aprobada', singular: 'aprobada', plural: 'aprobadas' },
  { estado: 'regular', singular: 'regular', plural: 'regulares' },
  { estado: 'cursando', singular: 'cursando', plural: 'cursando' },
  { estado: 'libre', singular: 'libre', plural: 'libres' },
  { estado: 'no_cursada', singular: 'no cursada', plural: 'no cursadas' },
];

// Porcentaje aprobado y barra con cuántas materias hay en cada estado.
export function ProgresoFormacion({ materias }: { materias: MateriaFormacion[] }) {
  const total = materias.length;
  const cantidad = (estado: EstadoMateria) => materias.filter((m) => m.estado === estado).length;
  const porcentaje = total ? Math.round((cantidad('aprobada') / total) * 100) : 0;
  const partes = PARTES.map((p) => ({ ...p, n: cantidad(p.estado) })).filter((p) => p.n > 0);

  return (
    <section className="materias-progreso">
      <div className="materias-progreso__cabecera">
        <p className="materias-progreso__porcentaje"><strong>{porcentaje}%</strong> aprobado</p>
        <ul className="materias-progreso__leyenda">
          {partes.map((p) => (
            <li key={p.estado}>
              <span className={`materias-progreso__punto materias-progreso__punto--${p.estado}`} aria-hidden="true" />
              {p.n} {p.n === 1 ? p.singular : p.plural}
            </li>
          ))}
        </ul>
      </div>
      <div className="materias-progreso__barra" aria-hidden="true">
        {partes.filter((p) => p.estado !== 'no_cursada').map((p) => (
          <span key={p.estado} className={`materias-progreso__parte materias-progreso__punto--${p.estado}`} style={{ width: `${(p.n / total) * 100}%` }} />
        ))}
      </div>
    </section>
  );
}
