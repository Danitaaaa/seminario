import { useEffect, useRef, useState } from 'react';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { usarAvisos } from '../../hooks/usarAvisos';
import { MapaMentalDibujo } from './mapaMentalDibujo';
import type { MapaMental, NodoMapa } from '../../types/ia';

const MAX_TEXTO_IDEA = 120;
const MAX_TITULO = 200;

// Las ideas que cuelgan de `id` (hijos, nietos...), sin incluirla.
function descendientes(nodos: NodoMapa[], id: string): Set<string> {
  const encontrados = new Set<string>();
  const pila = [id];
  while (pila.length) {
    const actual = pila.pop()!;
    for (const n of nodos) {
      if (n.padreId === actual && !encontrados.has(n.id)) {
        encontrados.add(n.id);
        pila.push(n.id);
      }
    }
  }
  return encontrados;
}

// Lo mismo que valida el main (esquema del mapa), para avisar antes de guardar.
function problemaDelMapa(mapa: MapaMental): string | null {
  if (!mapa.titulo.trim()) return 'El mapa necesita un título.';
  if (mapa.nodos.length < 2) return 'El mapa necesita al menos una idea además del tema central.';
  if (mapa.nodos.some((n) => !n.texto.trim())) return 'Hay una idea sin texto. Escribila o eliminala.';
  return null;
}

interface EditorMapaMentalProps {
  mapa: MapaMental;
  onGuardar: (mapa: MapaMental) => Promise<void>;
  onSalir: () => void;
}

// Editar un mapa mental: tocar una idea para cambiarle el texto, agregar ideas debajo de ella o
// eliminarla (con todo lo que cuelga de ella). Los cambios se guardan juntos con "Guardar".
export function EditorMapaMental({ mapa, onGuardar, onSalir }: EditorMapaMentalProps) {
  const { confirmar } = usarAvisos();
  const [borrador, setBorrador] = useState<MapaMental>(mapa);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [cambios, setCambios] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [problema, setProblema] = useState('');
  const textoRef = useRef<HTMLInputElement>(null);
  const contador = useRef(0);

  const raiz = borrador.nodos.find((n) => n.padreId === null);
  const elegido = borrador.nodos.find((n) => n.id === seleccionado) ?? null;

  // Al elegir una idea, el cuadro de texto queda listo para escribir.
  useEffect(() => {
    if (seleccionado) textoRef.current?.focus();
  }, [seleccionado]);

  function cambiar(nuevo: MapaMental) {
    setBorrador(nuevo);
    setCambios(true);
    setProblema('');
  }

  function cambiarTexto(texto: string) {
    if (!elegido) return;
    cambiar({ ...borrador, nodos: borrador.nodos.map((n) => (n.id === elegido.id ? { ...n, texto } : n)) });
  }

  function nuevoId(): string {
    const usados = new Set(borrador.nodos.map((n) => n.id));
    let id: string;
    do id = `nuevo${++contador.current}`;
    while (usados.has(id));
    return id;
  }

  // Agrega una idea debajo de la elegida (o del tema central si no hay ninguna elegida).
  function agregar() {
    const padre = elegido ?? raiz;
    if (!padre) return;
    const nodo: NodoMapa = { id: nuevoId(), texto: 'Nueva idea', padreId: padre.id };
    cambiar({ ...borrador, nodos: [...borrador.nodos, nodo] });
    setSeleccionado(nodo.id);
    // Se selecciona el texto para reemplazarlo escribiendo.
    requestAnimationFrame(() => textoRef.current?.select());
  }

  async function eliminar() {
    if (!elegido || elegido.padreId === null) return;
    const debajo = descendientes(borrador.nodos, elegido.id);
    if (debajo.size > 0) {
      const ok = await confirmar(
        `"${elegido.texto || 'Esta idea'}" tiene ${debajo.size} ${debajo.size === 1 ? 'idea' : 'ideas'} debajo. Se van a eliminar todas.`,
        { titulo: 'Eliminar idea', textoConfirmar: 'Eliminar', peligro: true },
      );
      if (!ok) return;
    }
    cambiar({ ...borrador, nodos: borrador.nodos.filter((n) => n.id !== elegido.id && !debajo.has(n.id)) });
    setSeleccionado(elegido.padreId);
  }

  async function guardar() {
    const limpio: MapaMental = {
      titulo: borrador.titulo.trim(),
      nodos: borrador.nodos.map((n) => ({ ...n, texto: n.texto.trim() })),
    };
    const error = problemaDelMapa(limpio);
    if (error) {
      setProblema(error);
      return;
    }
    setGuardando(true);
    try {
      await onGuardar(limpio);
    } finally {
      setGuardando(false);
    }
  }

  async function descartar() {
    if (cambios) {
      const ok = await confirmar('Se van a perder los cambios que no guardaste.', {
        titulo: 'Descartar cambios',
        textoConfirmar: 'Descartar',
        peligro: true,
      });
      if (!ok) return;
    }
    onSalir();
  }

  return (
    <div className="editor-mapa">
      <div className="editor-mapa__barra">
        <label className="editor-mapa__campo editor-mapa__campo--titulo">
          <span>Título del mapa</span>
          <input
            value={borrador.titulo}
            maxLength={MAX_TITULO}
            onChange={(e) => cambiar({ ...borrador, titulo: e.target.value })}
          />
        </label>

        <label className="editor-mapa__campo">
          <span>{elegido ? (elegido.padreId === null ? 'Tema central' : 'Idea elegida') : 'Idea elegida'}</span>
          <input
            ref={textoRef}
            value={elegido?.texto ?? ''}
            maxLength={MAX_TEXTO_IDEA}
            placeholder="Tocá una idea del mapa para editarla"
            disabled={!elegido}
            onChange={(e) => cambiarTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                agregar();
              }
            }}
          />
        </label>

        <div className="editor-mapa__acciones">
          <button
            type="button"
            className="editor-mapa__boton"
            onClick={agregar}
            title={elegido ? 'Agregar una idea debajo de la elegida (Enter)' : 'Agregar una idea al tema central'}
          >
            <Plus size={15} /> Agregar idea
          </button>
          <button
            type="button"
            className="editor-mapa__boton editor-mapa__boton--peligro"
            onClick={() => void eliminar()}
            disabled={!elegido || elegido.padreId === null}
            title={elegido?.padreId === null ? 'El tema central no se puede eliminar' : 'Eliminar la idea elegida'}
          >
            <Trash2 size={15} /> Eliminar
          </button>
          <span className="editor-mapa__separador" />
          <button type="button" className="editor-mapa__boton" onClick={() => void descartar()} disabled={guardando}>
            <X size={15} /> {cambios ? 'Descartar' : 'Salir'}
          </button>
          <button
            type="button"
            className="editor-mapa__boton editor-mapa__boton--primario"
            onClick={() => void guardar()}
            disabled={!cambios || guardando}
          >
            <Save size={15} /> {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      {problema && <p className="editor-mapa__problema" role="alert">{problema}</p>}
      <p className="editor-mapa__ayuda">
        Tocá una idea para cambiarle el texto. Enter agrega una idea debajo de la elegida. Arrastrá el fondo para moverte.
      </p>

      <MapaMentalDibujo mapa={borrador} seleccionado={seleccionado} onSeleccionar={setSeleccionado} />
    </div>
  );
}
