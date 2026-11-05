import { useState } from 'react';
import { Boton } from '../comunes/boton';
import type { Correlativa, MateriaFormacion } from '../../types/materias';
import { NOMBRE_ESTADO, materiasPorAnio, nombreAnio } from '../../pages/materias/utilidadesMaterias';

interface VistaCorrelativasProps {
  materias: MateriaFormacion[];
  correlativas: Correlativa[];
  onGuardar: (idMateria: number, requisitos: number[]) => Promise<boolean>;
}

// Una correlativa está cumplida si la materia está aprobada o regular.
const cumplida = (m: MateriaFormacion | undefined) => m?.estado === 'aprobada' || m?.estado === 'regular';

// Mapa del plan: al tocar una materia se marcan las que necesita y las que habilita.
export function VistaCorrelativas({ materias, correlativas, onGuardar }: VistaCorrelativasProps) {
  const [idElegida, setIdElegida] = useState<number | null>(null);
  const [borrador, setBorrador] = useState<Set<number> | null>(null);
  const [guardando, setGuardando] = useState(false);

  const porId = new Map(materias.map((m) => [m.idMateria, m]));
  const elegida = idElegida === null ? undefined : porId.get(idElegida);
  const requisitos = new Set(correlativas.filter((c) => c.idMateria === idElegida).map((c) => c.idRequisito));
  const habilita = new Set(correlativas.filter((c) => c.idRequisito === idElegida).map((c) => c.idMateria));
  const necesita = borrador ?? requisitos;

  function tocar(m: MateriaFormacion) {
    if (borrador && idElegida !== null) {
      if (m.idMateria === idElegida) return;
      const nuevo = new Set(borrador);
      if (nuevo.has(m.idMateria)) nuevo.delete(m.idMateria);
      else nuevo.add(m.idMateria);
      return setBorrador(nuevo);
    }
    setIdElegida(m.idMateria === idElegida ? null : m.idMateria);
  }

  async function guardar() {
    if (!borrador || idElegida === null) return;
    setGuardando(true);
    if (await onGuardar(idElegida, [...borrador])) setBorrador(null);
    setGuardando(false);
  }

  function aviso(m: MateriaFormacion): string {
    if (m.estado === 'aprobada') return 'Ya la aprobaste.';
    if (requisitos.size === 0) return 'No tiene correlativas cargadas.';
    const faltan = [...requisitos].filter((id) => !cumplida(porId.get(id))).length;
    if (faltan === 0) return 'Podés cursarla: tenés todas las correlativas.';
    return `Te ${faltan === 1 ? 'falta 1 correlativa' : `faltan ${faltan} correlativas`}.`;
  }

  const clase = (m: MateriaFormacion) => {
    if (m.idMateria === idElegida) return ' materias-mapa__materia--elegida';
    if (necesita.has(m.idMateria)) return ' materias-mapa__materia--necesita';
    if (!borrador && habilita.has(m.idMateria)) return ' materias-mapa__materia--habilita';
    return '';
  };

  return (
    <div className="materias-mapa">
      <div className="materias-mapa__plan">
        <ul className="materias-mapa__leyenda">
          <li><span className="materias-mapa__muestra materias-mapa__materia--elegida" aria-hidden="true" />Seleccionada</li>
          <li><span className="materias-mapa__muestra materias-mapa__materia--necesita" aria-hidden="true" />Necesitás</li>
          <li><span className="materias-mapa__muestra materias-mapa__materia--habilita" aria-hidden="true" />Te habilita</li>
        </ul>
        <div className="materias-mapa__anios">
          {materiasPorAnio(materias).map((grupo) => (
            <section key={grupo.anio ?? 'sin-anio'} className="materias-mapa__columna">
              <h3>{nombreAnio(grupo.anio)}</h3>
              {grupo.materias.map((m) => (
                <button key={m.idMateria} type="button" className={`materias-mapa__materia${clase(m)}`} onClick={() => tocar(m)}>
                  <span>{m.nombre}</span>
                  <span className="materias-mapa__estado">{NOMBRE_ESTADO[m.estado]}</span>
                </button>
              ))}
            </section>
          ))}
        </div>
      </div>

      <aside className="materias-mapa__panel">
        {!elegida && <p className="materias-ayuda">Tocá una materia para ver qué necesitás y qué te habilita.</p>}
        {elegida && (
          <>
            <span className="materias-mapa__meta">{nombreAnio(elegida.anio)} · {NOMBRE_ESTADO[elegida.estado]}</span>
            <h3 className="materias-mapa__nombre">{elegida.nombre}</h3>

            {borrador ? (
              <p className="materias-mapa__aviso">Tocá en el plan las materias que necesita esta. Volvé a tocar una para sacarla.</p>
            ) : (
              <p className="materias-mapa__aviso">{aviso(elegida)}</p>
            )}

            <h4>Necesitás</h4>
            {necesita.size === 0 && <p className="materias-ayuda">Ninguna.</p>}
            <ul className="materias-mapa__lista">
              {[...necesita].map((id) => porId.get(id)).filter((m): m is MateriaFormacion => !!m).map((m) => (
                <li key={m.idMateria}><span>{m.nombre}</span><span className={cumplida(m) ? 'materias-mapa__ok' : ''}>{NOMBRE_ESTADO[m.estado]}</span></li>
              ))}
            </ul>

            {!borrador && (
              <>
                <h4>Te habilita</h4>
                {habilita.size === 0 && <p className="materias-ayuda">Ninguna.</p>}
                <ul className="materias-mapa__lista">
                  {[...habilita].map((id) => porId.get(id)).filter((m): m is MateriaFormacion => !!m).map((m) => (
                    <li key={m.idMateria}><span>{m.nombre}</span></li>
                  ))}
                </ul>
              </>
            )}

            <div className="materias-acciones">
              {borrador ? (
                <>
                  <Boton variante="contorno" onClick={() => setBorrador(null)}>Cancelar</Boton>
                  <Boton onClick={() => void guardar()} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
                </>
              ) : (
                <Boton variante="contorno" onClick={() => setBorrador(new Set(requisitos))}>Editar correlativas</Boton>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
