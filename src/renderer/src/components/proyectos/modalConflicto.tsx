import { useEffect, useMemo, useState } from 'react';
import type { ClaveEdicion, Resultado } from '../../hooks/useEdicionCompartida';
import { formatearHora } from './bannerEdicion';
import '../../styles/nodos.css';
import '../../styles/edicion.css';

interface ConflictoDatos {
    local: { datos: unknown; contenido?: Uint8Array };
    remoto: { version: number; datos: unknown; autor: string | null; fecha: string | Date | null; contenido?: Uint8Array };
}
interface ApiConflicto {
    obtenerConflicto(c: ClaveEdicion): Promise<Resultado<ConflictoDatos>>;
    resolverConflicto(d: ClaveEdicion & {
        eleccion: 'local' | 'remota' | 'mezcla';
        datosMezcla?: unknown;
        contenidoMezcla?: string;
    }): Promise<Resultado<{ version: number }>>;
}
type Lado = 'local' | 'remota' | 'propio';

const esObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2) ?? '');

// Solo estos archivos se pueden mostrar y mezclar como texto. El resto (imágenes, pdf, docx…) se elige entero.
const EXTENSIONES_TEXTO = new Set(['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts', 'tsx', 'jsx', 'log', 'yml', 'yaml', 'ini', 'sql']);
const LIMITE_TEXTO = 500_000; // bytes: por encima de esto no se muestra en pantalla
const aTexto = (b?: Uint8Array) => (b ? new TextDecoder('utf-8').decode(b) : '');

interface Props { clave: ClaveEdicion; onCerrar: () => void; onResuelto: () => void }

export function ModalConflicto({ clave, onCerrar, onResuelto }: Props) {
    const api = window.api as unknown as ApiConflicto;
    const [datos, setDatos] = useState<ConflictoDatos | null>(null);
    const [elec, setElec] = useState<Record<string, Lado>>({});
    const [propio, setPropio] = useState<Record<string, string>>({});
    const [ladoArchivo, setLadoArchivo] = useState<Lado>('local');
    const [textoPropio, setTextoPropio] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        void api.obtenerConflicto(clave).then(r => {
            if (!r.ok) return setError(r.mensaje);
            setDatos(r.datos);
            // La mezcla de archivos arranca con el texto local para poder editarlo.
            setTextoPropio(aTexto(r.datos.local.contenido));
        });
    }, [api, clave.idGlobal]);

    const L = datos?.local.datos;
    const R = datos?.remoto.datos;
    const esArchivo = clave.entidad === 'archivo';

    const extension = esObj(L) && typeof L.extension === 'string' ? L.extension.toLowerCase() : '';
    const esTexto = esArchivo && EXTENSIONES_TEXTO.has(extension)
        && (datos?.local.contenido?.byteLength ?? 0) <= LIMITE_TEXTO
        && (datos?.remoto.contenido?.byteLength ?? 0) <= LIMITE_TEXTO;
    const textoLocal = useMemo(() => (esTexto ? aTexto(datos?.local.contenido) : ''), [datos, esTexto]);
    const textoRemoto = useMemo(() => (esTexto ? aTexto(datos?.remoto.contenido) : ''), [datos, esTexto]);

    const porCampos = esObj(L) && esObj(R) && !esArchivo; // los archivos se resuelven aparte
    const campos = useMemo(() => {
        if (!datos) return [];
        if (!porCampos) return ['(todo)'];
        const l = L as Record<string, unknown>, r = R as Record<string, unknown>;
        return Object.keys({ ...l, ...r }).filter(c => JSON.stringify(l[c]) !== JSON.stringify(r[c]));
    }, [datos, porCampos]);

    const valor = (c: string, lado: 'local' | 'remota') =>
        porCampos ? ((lado === 'local' ? L : R) as Record<string, unknown>)[c] : lado === 'local' ? L : R;

    const enviar = async (
        eleccion: 'local' | 'remota' | 'mezcla',
        datosMezcla?: unknown,
        contenidoMezcla?: string,
    ) => {
        setEnviando(true); setError(null);
        const r = await api.resolverConflicto({ ...clave, eleccion, datosMezcla, contenidoMezcla });
        setEnviando(false);
        if (r.ok) onResuelto();
        else setError(r.codigo === 'BLOQUEO_OCUPADO' ? `${r.mensaje} Probá de nuevo cuando termine.` : r.mensaje);
    };

    const confirmarPorCampos = () => {
        const sel = (c: string): Lado => elec[c] ?? 'local';
        if (campos.every(c => sel(c) === 'local')) return void enviar('local');
        if (campos.every(c => sel(c) === 'remota')) return void enviar('remota');
        const elegido = (c: string) => (sel(c) === 'propio' ? propio[c] ?? '' : valor(c, sel(c) as 'local' | 'remota'));
        const mezcla = porCampos
            ? { ...(L as object), ...Object.fromEntries(campos.map(c => [c, elegido(c)])) }
            : elegido('(todo)');
        void enviar('mezcla', mezcla);
    };

    const confirmarArchivo = () => {
        if (ladoArchivo === 'local') return void enviar('local');
        if (ladoArchivo === 'remota') return void enviar('remota');
        // Mezcla: los metadatos (nombre, carpeta) quedan los locales; solo cambia el texto.
        void enviar('mezcla', undefined, textoPropio);
    };

    return (
        <div className="modal-overlay" onClick={onCerrar}>
            <div className="modal modal--ancho" onClick={e => e.stopPropagation()}>
                <h2 className="modal__titulo">Resolver conflicto</h2>
                {!datos && !error && <p className="modal__texto">Cargando…</p>}
                {error && <p className="edicion-banner edicion-banner--error">{error}</p>}
                {datos && (
                    <>
                        <p className="modal__texto">
                            Tu versión se editó sin conexión o sin bloqueo, y {datos.remoto.autor ?? 'otra persona'} guardó la versión{' '}
                            {datos.remoto.version} el {formatearHora(datos.remoto.fecha)}. Elegí con qué quedarte.
                        </p>

                        {esArchivo && esTexto && (
                            <div className="conflicto-campo">
                                <div className="conflicto-columnas">
                                    <Opcion nombre={`archivo-${clave.idGlobal}`} etiqueta="Mi versión" marcado={ladoArchivo === 'local'}
                                        onElegir={() => setLadoArchivo('local')} contenido={textoLocal} />
                                    <Opcion nombre={`archivo-${clave.idGlobal}`} etiqueta="Versión remota" marcado={ladoArchivo === 'remota'}
                                        onElegir={() => setLadoArchivo('remota')} contenido={textoRemoto} />
                                </div>
                                <label className="conflicto-propio">
                                    <input type="radio" name={`archivo-${clave.idGlobal}`} checked={ladoArchivo === 'propio'}
                                        onChange={() => setLadoArchivo('propio')} />
                                    Escribir el resultado a mano
                                    {ladoArchivo === 'propio' && (
                                        <textarea value={textoPropio} onChange={e => setTextoPropio(e.target.value)} rows={10} />
                                    )}
                                </label>
                            </div>
                        )}

                        {esArchivo && !esTexto && (
                            <div className="conflicto-campo">
                                <p className="modal__texto">
                                    Este tipo de archivo no se puede comparar ni mezclar: se conserva uno completo.
                                </p>
                                <div className="conflicto-columnas">
                                    <Opcion nombre={`archivo-${clave.idGlobal}`} etiqueta="Mi versión" marcado={ladoArchivo !== 'remota'}
                                        onElegir={() => setLadoArchivo('local')}
                                        contenido={`${datos.local.contenido?.byteLength ?? 0} bytes`} />
                                    <Opcion nombre={`archivo-${clave.idGlobal}`} etiqueta="Versión remota" marcado={ladoArchivo === 'remota'}
                                        onElegir={() => setLadoArchivo('remota')}
                                        contenido={`${datos.remoto.contenido?.byteLength ?? 0} bytes`} />
                                </div>
                            </div>
                        )}

                        {!esArchivo && campos.map(c => (
                            <div key={c} className="conflicto-campo">
                                <strong>{c}</strong>
                                <div className="conflicto-columnas">
                                    <Opcion nombre={`${c}-${clave.idGlobal}`} etiqueta="Mi versión" marcado={(elec[c] ?? 'local') === 'local'}
                                        onElegir={() => setElec(e => ({ ...e, [c]: 'local' }))} contenido={texto(valor(c, 'local'))} />
                                    <Opcion nombre={`${c}-${clave.idGlobal}`} etiqueta="Versión remota" marcado={elec[c] === 'remota'}
                                        onElegir={() => setElec(e => ({ ...e, [c]: 'remota' }))} contenido={texto(valor(c, 'remota'))} />
                                </div>
                                {typeof valor(c, 'local') === 'string' && (
                                    <label className="conflicto-propio">
                                        <input type="radio" name={`${c}-${clave.idGlobal}`} checked={elec[c] === 'propio'}
                                            onChange={() => { setElec(e => ({ ...e, [c]: 'propio' })); setPropio(p => ({ ...p, [c]: p[c] ?? String(valor(c, 'local')) })); }} />
                                        Escribir el resultado a mano
                                        {elec[c] === 'propio' && (
                                            <textarea value={propio[c] ?? ''} onChange={e => setPropio(p => ({ ...p, [c]: e.target.value }))} rows={4} />
                                        )}
                                    </label>
                                )}
                            </div>
                        ))}

                        <div className="modal__acciones">
                            <button type="button" className="btn-proyecto btn-proyecto--secundario" onClick={onCerrar} disabled={enviando}>Más tarde</button>
                            <button type="button" className="btn-proyecto" disabled={enviando}
                                onClick={esArchivo ? confirmarArchivo : confirmarPorCampos}>
                                Confirmar
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function Opcion({ nombre, etiqueta, marcado, onElegir, contenido }: {
    nombre: string; etiqueta: string; marcado: boolean; onElegir: () => void; contenido: string;
}) {
    return (
        <label className={`conflicto-opcion${marcado ? ' conflicto-opcion--activa' : ''}`}>
            <span><input type="radio" name={nombre} checked={marcado} onChange={onElegir} /> {etiqueta}</span>
            <pre>{contenido}</pre>
        </label>
    );
}