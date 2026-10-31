import { useState } from 'react';
import type { RolMiembro } from '../../types/proyectos';
import type { ColumnaMiembro, FiltroTareas, MiembroTablero, Tarea } from '../../types/tareas';
import { coincideFiltro, iniciales, nombreCorto, primerNombre } from '../../utils/tablero';
import { AccionesTarjeta, TarjetaTarea } from './tarjetaTarea';

interface Props {
  // null = columna "Sin asignar"
  miembro: ColumnaMiembro | null;
  // todas las tareas de la columna, sin filtrar (para los contadores)
  tareas: Tarea[];
  filtro: FiltroTareas;
  // Ya no se usa acá (se conserva para no tocar la página).
  asignables?: MiembroTablero[];
  rol: RolMiembro | null;
  // idGlobal -> nombre de quien la está editando
  bloqueos: ReadonlyMap<string, string>;
  onSoltar: (idAsignadoGlobal: string | null) => void;
  idArrastrada: number | null;
  puedeSoltar: boolean;
  acciones: AccionesTarjeta;
}

function etiquetaRol(miembro: ColumnaMiembro): string {
  if (miembro.rol === 'propietario') return 'Organizador/a';
  return miembro.rol === 'editor' ? 'Colaborador/a' : 'Lector/a';
}

export function ColumnaTareas({
  miembro,
  tareas,
  filtro,
  rol,
  bloqueos,
  idArrastrada,
  puedeSoltar,
  acciones,
  onSoltar,
}: Props) {
  const [sobre, setSobre] = useState(false);
  const [hechasAbiertas, setHechasAbiertas] = useState(false);

  const sinAsignar = miembro === null;
  const idColumna = miembro?.idGlobal ?? null;

  const visibles = tareas.filter((t) => coincideFiltro(t, filtro, sinAsignar));
  const pendientes = visibles.filter((t) => !t.completada);
  const hechas = visibles.filter((t) => t.completada);

  const totalHechas = tareas.filter((t) => t.completada).length;
  const porcentaje = tareas.length === 0 ? 0 : (totalHechas / tareas.length) * 100;

  const mostrarHechas = filtro !== 'pendientes' && hechas.length > 0;
  const hechasExpandidas = filtro === 'hechas' || hechasAbiertas;
  const resaltada = sobre && puedeSoltar;
  const nombre = miembro ? (miembro.esYo ? 'Vos' : nombreCorto(miembro.nombre)) : 'Sin asignar';

  function textoZonaSoltar(): string {
    if (!resaltada) return 'Soltá una tarea acá';
    if (!miembro) return 'Soltá para dejar sin asignar';
    return miembro.esYo ? 'Soltá para asignártela' : `Soltá para asignar a ${primerNombre(miembro.nombre)}`;
  }

  function renderTarjeta(t: Tarea) {
    return (
      <TarjetaTarea
        key={t.idTarea}
        tarea={t}
        rol={rol}
        bloqueadaPor={bloqueos.get(t.idGlobal)}
        arrastrando={idArrastrada === t.idTarea}
        {...acciones}
      />
    );
  }

  return (
    <section
      className={`tarea-columna${sinAsignar ? ' tarea-columna--sin-asignar' : ''}`}
      aria-label={`Tareas de ${nombre}`}
      onDragOver={(e) => {
        if (!puedeSoltar) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDragEnter={(e) => {
        if (!puedeSoltar) return;
        e.preventDefault();
        setSobre(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSobre(false);
      }}
      onDrop={(e) => {
        if (!puedeSoltar) return;
        e.preventDefault();
        setSobre(false);
        onSoltar(idColumna);
      }}
    >
      {miembro ? (
        <header className="tarea-columna__cabecera">
          <span
            className="tarea-avatar"
            style={{ background: miembro.color.fondo, color: miembro.color.texto }}
            aria-hidden="true"
          >
            {iniciales(miembro.nombre)}
          </span>
          <div className="tarea-columna__quien">
            <strong>{nombre}</strong>
            <span>{etiquetaRol(miembro)}</span>
          </div>
          <span className="tarea-columna__cuenta" aria-label={`${totalHechas} de ${tareas.length} hechas`}>
            {totalHechas}/{tareas.length}
          </span>
        </header>
      ) : (
        <header className="tarea-columna__cabecera tarea-columna__cabecera--vertical">
          <div className="tarea-columna__titulo-fila">
            <strong>Sin asignar</strong>
            <span className="tarea-insignia">{tareas.length}</span>
          </div>
          <span className="tarea-columna__ayuda">Arrastralas a un integrante</span>
        </header>
      )}

      {miembro && (
        <div className="tarea-progreso" aria-hidden="true">
          <div className="tarea-progreso__relleno" style={{ width: `${porcentaje}%`, background: miembro.color.fondo }} />
        </div>
      )}

      {pendientes.map(renderTarjeta)}

      {pendientes.length === 0 && !mostrarHechas && !puedeSoltar && (
        <p className="tarea-columna__vacia">{tareas.length === 0 ? 'Sin tareas' : 'Nada para mostrar con este filtro'}</p>
      )}

      {mostrarHechas && (
        <>
          <div className="tarea-columna__hechas">
            <span>Hechas · {hechas.length}</span>
            {filtro !== 'hechas' && (
              <button
                type="button"
                onClick={() => setHechasAbiertas((v) => !v)}
                aria-expanded={hechasExpandidas}
              >
                {hechasExpandidas ? 'Ocultar' : 'Ver'}
              </button>
            )}
          </div>
          {hechasExpandidas && hechas.map(renderTarjeta)}
        </>
      )}

      {puedeSoltar && (
        <div className={`tarea-zona-soltar${resaltada ? ' tarea-zona-soltar--activa' : ''}`}>
          {textoZonaSoltar()}
        </div>
      )}
    </section>
  );
}