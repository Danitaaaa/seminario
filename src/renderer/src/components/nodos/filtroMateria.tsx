import { useMemo, useState } from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import type { OpcionMateria } from '../../types/materias';
import { Desplegable } from '../comunes/desplegable';

type FiltroEstado = 'cursando' | 'aprobada' | 'todas';
type Grupo = { nombre: string; materias: OpcionMateria[] };

const FILTROS_ESTADO: { valor: FiltroEstado; nombre: string }[] = [
  { valor: 'cursando', nombre: 'Cursando' },
  { valor: 'aprobada', nombre: 'Aprobadas' },
  { valor: 'todas', nombre: 'Todas' },
];

interface FiltroMateriaProps {
  materias: OpcionMateria[];
  valor: number | '';
  onCambiar: (idMateria: number | '') => void;
}

// Agrupa por año (si hay una formación elegida) o por "Formación · año" (si se ven todas).
function agrupar(materias: OpcionMateria[], porAnio: boolean): Grupo[] {
  return materias.reduce<Grupo[]>((acc, m) => {
    const nombre = porAnio ? (m.anio ? `${m.anio}° año` : 'Sin año') : m.grupo;
    const ultimo = acc[acc.length - 1];
    if (ultimo && ultimo.nombre === nombre) ultimo.materias.push(m);
    else acc.push({ nombre, materias: [m] });
    return acc;
  }, []);
}

// Filtro de Material por formación y materia. Las materias "No cursada" no se muestran.
export function FiltroMateria({ materias, valor, onCambiar }: FiltroMateriaProps) {
  const [formacion, setFormacion] = useState('');
  const [estado, setEstado] = useState<FiltroEstado>('todas');

  const cursadas = useMemo(() => materias.filter((m) => m.estado !== 'no_cursada'), [materias]);
  const formaciones = useMemo(() => [...new Set(cursadas.map((m) => m.formacion))], [cursadas]);
  const deFormacion = cursadas.filter((m) => formacion === '' || m.formacion === formacion);

  function elegirFormacion(nueva: string) {
    setFormacion(nueva);
    const actual = cursadas.find((m) => m.idMateria === valor);
    if (actual && nueva !== '' && actual.formacion !== nueva) onCambiar('');
  }

  const visibles = deFormacion.filter((m) => estado === 'todas' || m.estado === estado);
  const elegirEstado = (nuevo: FiltroEstado) => {
    setEstado(nuevo);
    const actual = cursadas.find((m) => m.idMateria === valor);
    if (actual && nuevo !== 'todas' && actual.estado !== nuevo) onCambiar('');
  };

  return (
    <div className="filtro-materia">
      <Desplegable etiqueta="Formación" valor={formacion} onCambiar={elegirFormacion}
        icono={<GraduationCap size={16} aria-hidden="true" />}
        opciones={[{ valor: '', nombre: 'Todas las formaciones' }, ...formaciones.map((f) => ({ valor: f, nombre: f }))]} />
      <Desplegable etiqueta="Materia" valor={String(valor)} onCambiar={(v) => onCambiar(v === '' ? '' : Number(v))}
        icono={<BookOpen size={16} aria-hidden="true" />}
        opciones={[
          { valor: '', nombre: 'Todas las materias' },
          ...agrupar(visibles, formacion !== '').flatMap((g) =>
            g.materias.map((m) => ({ valor: String(m.idMateria), nombre: m.nombre, grupo: g.nombre }))),
        ]} />
      <div className="filtro-materia__chips" role="group" aria-label="Estado de la materia">
        {FILTROS_ESTADO.map((f) => (
          <button key={f.valor} type="button" aria-pressed={estado === f.valor}
            className={`filtro-materia__chip${estado === f.valor ? ' filtro-materia__chip--activo' : ''}`}
            onClick={() => elegirEstado(f.valor)}>
            {f.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
