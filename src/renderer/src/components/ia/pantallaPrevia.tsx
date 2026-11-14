import { useMemo, useState } from 'react';
import { CartelError } from '../comunes/cartelError';
import {
  nombreProveedorIA,
  NOMBRE_TIPO_IA,
  type ContenidoIA,
  type MapaMental,
  type MaterialIA,
  type PropuestaIA,
  type Resumen,
} from '../../types/ia';

interface PantallaPreviaProps {
  propuesta: PropuestaIA;
  onGuardado: (guardado: MaterialIA) => void;
  onDescartado: () => void;
}

// La IA propone → el usuario revisa, edita y confirma. Nada se guarda sin pasar por acá.
// (Solo resúmenes y mapas: los cuestionarios no tienen pantalla previa, se verían las respuestas.)
export function PantallaPrevia({ propuesta, onGuardado, onDescartado }: PantallaPreviaProps) {
  const [contenido, setContenido] = useState<ContenidoIA>(() => structuredClone(propuesta.contenido));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const faltantes = useMemo(() => revisar(propuesta.tipo, contenido), [propuesta.tipo, contenido]);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      onGuardado(await window.api.guardarMaterialIA({ trabajoId: propuesta.trabajoId, contenido }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const descartar = async () => {
    await window.api.descartarMaterialIA({ trabajoId: propuesta.trabajoId }).catch(() => {});
    onDescartado();
  };

  return (
    <div className="ia-previa">
      <p className="ia-previa__origen">
        {NOMBRE_TIPO_IA[propuesta.tipo]} de <strong>{propuesta.fuente}</strong> · hecho con{' '}
        {propuesta.proveedores.map((p) => nombreProveedorIA(p)).join(', ')}. Revisalo antes de guardar.
      </p>

      <div className="ia-previa__cuerpo">
        {propuesta.tipo === 'resumen' && <EditorResumen valor={contenido as Resumen} onChange={setContenido} />}
        {propuesta.tipo === 'mapaMental' && <EditorMapa valor={contenido as MapaMental} onChange={setContenido} />}
      </div>

      {faltantes.length > 0 && (
        <ul className="ia-previa__faltantes">
          {faltantes.map((f) => <li key={f}>{f}</li>)}
        </ul>
      )}
      {error && <CartelError mensaje={error} titulo="No se pudo guardar" onCerrar={() => setError(null)} />}

      <footer className="ia-previa__pie">
        <button type="button" className="visor-boton visor-boton--contorno" onClick={descartar} disabled={guardando}>
          Descartar
        </button>
        <button
          type="button"
          className="visor-boton visor-boton--contorno"
          onClick={() => setContenido(structuredClone(propuesta.contenido))}
          disabled={guardando}
        >
          Deshacer cambios
        </button>
        <button type="button" className="visor-boton" onClick={guardar} disabled={guardando || faltantes.length > 0}>
          {guardando ? 'Guardando…' : 'Confirmar y guardar'}
        </button>
      </footer>
    </div>
  );
}

// Chequeos rápidos para avisar antes de confirmar. La validación completa la hace el main con zod.
function revisar(tipo: PropuestaIA['tipo'], c: ContenidoIA): string[] {
  const p: string[] = [];
  if (!c.titulo.trim()) p.push('Falta el título.');
  if (tipo === 'resumen') {
    const r = c as Resumen;
    if (r.ideasClave.length === 0 || r.ideasClave.some((i) => !i.trim())) p.push('Hay ideas clave vacías (o ninguna).');
    if (r.secciones.length === 0 || r.secciones.some((s) => !s.titulo.trim() || !s.contenido.trim())) p.push('Hay secciones incompletas (o ninguna).');
  } else {
    const m = c as MapaMental;
    if (m.nodos.some((n) => !n.texto.trim())) p.push('Hay conceptos vacíos en el mapa.');
    if (m.nodos.length < 2) p.push('El mapa necesita al menos un concepto además del central.');
  }
  return p;
}

const reemplazar = <X,>(arr: X[], i: number, v: X) => arr.map((x, k) => (k === i ? v : x));
const quitar = <X,>(arr: X[], i: number) => arr.filter((_, k) => k !== i);

//Resumen 

function EditorResumen({ valor, onChange }: { valor: Resumen; onChange: (v: Resumen) => void }) {
  return (
    <div className="ia-editor">
      <label className="ia-editor__campo">
        Título
        <input value={valor.titulo} onChange={(e) => onChange({ ...valor, titulo: e.target.value })} />
      </label>

      <h4 className="ia-editor__subtitulo">Ideas clave</h4>
      {valor.ideasClave.map((idea, i) => (
        <div className="ia-editor__fila" key={i}>
          <input value={idea} onChange={(e) => onChange({ ...valor, ideasClave: reemplazar(valor.ideasClave, i, e.target.value) })} />
          <button type="button" className="ia-editor__quitar" aria-label="Quitar idea"
            onClick={() => onChange({ ...valor, ideasClave: quitar(valor.ideasClave, i) })}>×</button>
        </div>
      ))}
      <button type="button" className="ia-editor__agregar" onClick={() => onChange({ ...valor, ideasClave: [...valor.ideasClave, ''] })}>
        + Idea
      </button>

      <h4 className="ia-editor__subtitulo">Secciones</h4>
      {valor.secciones.map((s, i) => (
        <fieldset className="ia-editor__bloque" key={i}>
          <input value={s.titulo} placeholder="Título de la sección"
            onChange={(e) => onChange({ ...valor, secciones: reemplazar(valor.secciones, i, { ...s, titulo: e.target.value }) })} />
          <textarea rows={5} value={s.contenido}
            onChange={(e) => onChange({ ...valor, secciones: reemplazar(valor.secciones, i, { ...s, contenido: e.target.value }) })} />
          <button type="button" className="ia-editor__quitar-bloque"
            onClick={() => onChange({ ...valor, secciones: quitar(valor.secciones, i) })}>Quitar sección</button>
        </fieldset>
      ))}
      <button type="button" className="ia-editor__agregar"
        onClick={() => onChange({ ...valor, secciones: [...valor.secciones, { titulo: '', contenido: '' }] })}>
        + Sección
      </button>
    </div>
  );
}

//Mapa mental 

interface NodoArbol {
  id: string;
  texto: string;
  hijos: NodoArbol[];
}

function armarArbol(mapa: MapaMental): NodoArbol | null {
  const porId = new Map(mapa.nodos.map((n) => [n.id, { id: n.id, texto: n.texto, hijos: [] as NodoArbol[] }]));
  let raiz: NodoArbol | null = null;
  for (const n of mapa.nodos) {
    const nodo = porId.get(n.id)!;
    if (n.padreId === null) raiz = nodo;
    else porId.get(n.padreId)?.hijos.push(nodo);
  }
  return raiz;
}

function EditorMapa({ valor, onChange }: { valor: MapaMental; onChange: (v: MapaMental) => void }) {
  const arbol = useMemo(() => armarArbol(valor), [valor]);

  const editarTexto = (id: string, texto: string) =>
    onChange({ ...valor, nodos: valor.nodos.map((n) => (n.id === id ? { ...n, texto } : n)) });

  const agregarHijo = (padreId: string) =>
    onChange({ ...valor, nodos: [...valor.nodos, { id: `n${Date.now().toString(36)}`, texto: 'Nuevo concepto', padreId }] });

  // Borra el concepto y todo lo que cuelga de él.
  const borrarRama = (id: string) => {
    const aBorrar = new Set([id]);
    let huboCambios = true;
    while (huboCambios) {
      huboCambios = false;
      for (const n of valor.nodos) {
        if (n.padreId && aBorrar.has(n.padreId) && !aBorrar.has(n.id)) {
          aBorrar.add(n.id);
          huboCambios = true;
        }
      }
    }
    onChange({ ...valor, nodos: valor.nodos.filter((n) => !aBorrar.has(n.id)) });
  };

  const dibujar = (n: NodoArbol, esRaiz: boolean) => (
    <li key={n.id}>
      <div className="ia-editor__fila">
        <input value={n.texto} className={esRaiz ? 'ia-mapa__raiz' : undefined} onChange={(e) => editarTexto(n.id, e.target.value)} />
        <button type="button" className="ia-editor__quitar" onClick={() => agregarHijo(n.id)} aria-label="Agregar concepto">+</button>
        {!esRaiz && (
          <button type="button" className="ia-editor__quitar" onClick={() => borrarRama(n.id)} aria-label="Borrar rama">×</button>
        )}
      </div>
      {n.hijos.length > 0 && <ul>{n.hijos.map((h) => dibujar(h, false))}</ul>}
    </li>
  );

  return (
    <div className="ia-editor">
      <label className="ia-editor__campo">
        Título
        <input value={valor.titulo} onChange={(e) => onChange({ ...valor, titulo: e.target.value })} />
      </label>
      {arbol ? <ul className="ia-mapa">{dibujar(arbol, true)}</ul> : <p>El mapa no tiene un concepto central.</p>}
    </div>
  );
}
