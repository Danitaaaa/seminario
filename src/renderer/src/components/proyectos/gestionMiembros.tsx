import { useCallback, useEffect, useRef, useState } from 'react';
import type { InvitacionPendiente, Miembro } from '../../types/proyectos';
import { puede, rolDe } from '../../permisos';
import { usarAvisos } from '../../hooks/usarAvisos';
import { leerPaleta } from '../../hooks/usarModo';
import { buscarPaleta } from '../../styles/temas/paletas';
import { PALETA, claveMiembro, coloresDeMiembros } from '../../utils/tablero';

type RolEditable = 'editor' | 'lector';

interface Props {
    idProyecto: number;
    idUsuarioActual: number;
    miembros: Miembro[];
    onCambio: () => Promise<void> | void;
    onAbandono: () => void;
}

const ETIQUETA_ROL = { propietario: 'Propietario', editor: 'Editor', lector: 'Solo lectura' } as const;


// Electron antepone "Error invoking remote method '...': Error: " al mensaje del main.
const limpiar = (e: unknown) =>
    (e instanceof Error ? e.message : 'Ocurrió un error')
        .replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

// CAMBIO: el nombre ya viene en el tipo Miembro; si falta, se usa el mail.
const nombreDe = (m: Miembro) => m.nombre?.trim() || m.mail;

const iniciales = (nombre?: string | null) => {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    return partes.length === 0 ? '?' : partes.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
};


function IconoUsuarios() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
            <circle cx="17" cy="9" r="2.4" />
            <path d="M16.5 13.6c2.6 0 4.5 1.7 4.5 4.4" />
        </svg>
    );
}

export function GestionMiembros({ idProyecto, idUsuarioActual, miembros, onCambio, onAbandono }: Props) {
    const { confirmar } = usarAvisos();
    const [abierto, setAbierto] = useState(false);
    const [mail, setMail] = useState('');
    const [rolNuevo, setRolNuevo] = useState<RolEditable>('editor');
    const [ocupado, setOcupado] = useState(false);
    const [eligiendoColor, setEligiendoColor] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [invitaciones, setInvitaciones] = useState<InvitacionPendiente[]>([]);
    const raiz = useRef<HTMLDivElement>(null);

    // CAMBIO: defensivo, por si llega algún miembro dado de baja.
    const activos = miembros.filter((m) => m.activo !== false);

    const rol = rolDe(activos, idUsuarioActual);
    // Mismos colores que en la División de tareas y el cronograma: vos primero, sin repetir.
    const colores = coloresDeMiembros(miembros.filter((m) => m.activo), (m) => m.idUsuario === idUsuarioActual);
    const puedeInvitar = puede(rol, 'miembro.invitar');

    // Tu color en los proyectos: lo elegís tocando tu avatar. Con null vuelve al automático.
    async function elegirColor(color: number | null) {
        setEligiendoColor(false);
        try {
            await window.api.elegirColorAvatar({ id: idUsuarioActual, color });
            await onCambio();
        } catch {
            setError('No se pudo cambiar el color.');
        }
    }
    const puedeCambiarRol = puede(rol, 'miembro.cambiarRol');
    const puedeQuitarOtros = puede(rol, 'miembro.quitar');

    // CAMBIO: si el servidor ya lista a alguien como pendiente, no se repite desde la tabla de invitaciones.
    const mailsListados = new Set(activos.map((m) => m.mail.toLowerCase()));
    const invitacionesVisibles = invitaciones.filter((inv) => !mailsListados.has(inv.mail.toLowerCase()));

    const cerrar = () => {
        setAbierto(false);
        setError(null);
        setAviso(null);
    };

    const cargarInvitaciones = useCallback(async () => {
        if (!puedeInvitar) return setInvitaciones([]);
        try {
            setInvitaciones(
                await window.api.listarInvitaciones({ idProyecto, idUsuarioSolicitante: idUsuarioActual }),
            );
        } catch (e) {
            console.error(e);
            setError(limpiar(e));
        }
    }, [puedeInvitar, idProyecto, idUsuarioActual]);

    // Al abrir el panel (y cada vez que cambian los miembros) se refrescan las pendientes.
    useEffect(() => {
        if (abierto) void cargarInvitaciones();
    }, [abierto, miembros, cargarInvitaciones]);

    // Cierra con clic afuera o con Escape.
    useEffect(() => {
        if (!abierto) return;
        const alClic = (e: MouseEvent) => {
            if (raiz.current && !raiz.current.contains(e.target as Node)) cerrar();
        };
        const alTecla = (e: KeyboardEvent) => {
            if (e.key === 'Escape') cerrar();
        };
        document.addEventListener('mousedown', alClic);
        document.addEventListener('keydown', alTecla);
        return () => {
            document.removeEventListener('mousedown', alClic);
            document.removeEventListener('keydown', alTecla);
        };
    }, [abierto]);

    const ejecutar = async (accion: () => Promise<unknown>, despues?: () => void) => {
        setOcupado(true);
        setError(null);
        setAviso(null);
        try {
            await accion();
            await onCambio();
            await cargarInvitaciones();
            despues?.();
        } catch (e) {
            console.error(e);
            setError(limpiar(e));
        } finally {
            setOcupado(false);
        }
    };

    const invitar = () => {
        const limpio = mail.trim();
        if (!limpio) return setError('Ingresá el mail del integrante.');
        const colores = buscarPaleta(leerPaleta()).modos.claro;
        void ejecutar(
            () => window.api.agregarMiembroPorMail({
                idProyecto, idUsuarioSolicitante: idUsuarioActual, mail: limpio, rol: rolNuevo,
                coloresCorreo: {
                    primario: colores.primary,
                    fondo: colores.background,
                    superficie: colores.surface,
                    borde: colores.border,
                    texto: colores.textPrimary,
                    suave: colores.frostClaro,
                },
            }),
            () => {
                setMail('');
                setAviso(`Enviamos el enlace a ${limpio}. Queda pendiente hasta que se una.`);
            },
        );
    };

    const cancelarInvitacion = (inv: InvitacionPendiente) =>
        ejecutar(() => window.api.cancelarInvitacion({
            idProyecto, idUsuarioSolicitante: idUsuarioActual, idInvitacion: inv.idInvitacion,
        }));

    // CAMBIO: recibe el miembro entero y manda el mail (sirve aunque no exista en esta base).
    const cambiarRol = (m: Miembro, rol: RolEditable) =>
        ejecutar(() => window.api.cambiarRolMiembro({
            idProyecto, idUsuarioSolicitante: idUsuarioActual, mailMiembro: m.mail, rol,
        }));

    // CAMBIO: manda mail siempre e id solo si existe.
    const quitar = async (m: Miembro) => {
        const propio = m.idUsuario === idUsuarioActual;
        const texto = propio ? '¿Abandonar el proyecto?' : `¿Quitar a ${nombreDe(m)} del proyecto?`;
        if (!await confirmar(texto, {
            titulo: propio ? 'Abandonar proyecto' : 'Quitar integrante',
            textoConfirmar: propio ? 'Abandonar' : 'Quitar',
            peligro: true,
        })) return;
        void ejecutar(
            () => window.api.quitarMiembro({
                idProyecto,
                idUsuarioSolicitante: idUsuarioActual,
                idUsuarioMiembro: m.idUsuario ?? undefined,
                mailMiembro: m.mail,
            }),
            propio ? onAbandono : undefined,
        );
    };

    return (
        <div className="miembros" ref={raiz}>
            <button
                type="button"
                className={`miembros-abrir${abierto ? ' miembros-abrir--activo' : ''}`}
                onClick={() => (abierto ? cerrar() : setAbierto(true))}
                aria-expanded={abierto}
                aria-haspopup="dialog"
            >
                <IconoUsuarios />
                <span>Miembros</span>
                <span className="miembros-abrir__contador">{activos.length}</span>
            </button>

            {abierto && (
                <section className="miembros-panel" role="dialog" aria-label="Miembros del proyecto">
                    <header className="miembros-panel__cabecera">
                        <h3>Miembros del proyecto</h3>
                        <button type="button" className="miembros-panel__cerrar" onClick={cerrar} aria-label="Cerrar">
                            ×
                        </button>
                    </header>

                    <ul className="miembros-lista">
                        {activos.map((m) => {
                            const propio = m.idUsuario === idUsuarioActual;
                            const nombre = nombreDe(m);
                            const color = colores.get(claveMiembro(m)) ?? { fondo: 'var(--color-border)', texto: 'inherit' };
                            const editable = puedeCambiarRol && m.rol !== 'propietario' && !m.pendiente;
                            const puedeQuitar = m.rol !== 'propietario' && (puedeQuitarOtros || propio);
                            return (
                                <li
                                    key={m.mail}
                                    className={`miembros-item${m.pendiente ? ' miembros-item--pendiente' : ''}`}
                                >
                                    {propio ? (
                                        <span className="miembros-color">
                                            <button
                                                type="button"
                                                className="miembros-item__avatar miembros-item__avatar--elegible"
                                                style={{ background: color.fondo, color: color.texto }}
                                                onClick={() => setEligiendoColor((v) => !v)}
                                                title="Elegir tu color"
                                                aria-label="Elegir el color de tu avatar"
                                                aria-expanded={eligiendoColor}
                                            >
                                                {iniciales(nombre)}
                                            </button>
                                            {eligiendoColor && (
                                                <span className="miembros-color__paleta" role="group" aria-label="Colores" data-voz-grupo>
                                                    {PALETA.map((c, i) => (
                                                        <button
                                                            key={c.fondo}
                                                            type="button"
                                                            className="miembros-color__opcion"
                                                            style={{ background: c.fondo }}
                                                            aria-label={`Color ${i + 1}`}
                                                            aria-pressed={m.colorAvatar === i}
                                                            onClick={() => void elegirColor(i)}
                                                        />
                                                    ))}
                                                    <button type="button" className="miembros-color__auto" onClick={() => void elegirColor(null)}>
                                                        Automático
                                                    </button>
                                                </span>
                                            )}
                                        </span>
                                    ) : (
                                        <span
                                            className="miembros-item__avatar"
                                            style={{ background: color.fondo, color: color.texto }}
                                            aria-hidden="true"
                                        >
                                            {iniciales(nombre)}
                                        </span>
                                    )}

                                    <span className="miembros-item__nombre" title={m.mail}>
                                        {nombre}
                                        {propio && <small> (vos)</small>}
                                    </span>

                                    {m.pendiente ? (
                                        <span className="miembros-insignia miembros-insignia--pendiente">
                                            Esperando confirmación
                                        </span>
                                    ) : editable ? (
                                        <select
                                            className="miembros-item__rol-select"
                                            value={m.rol}
                                            disabled={ocupado}
                                            onChange={(e) => void cambiarRol(m, e.target.value as RolEditable)}
                                            aria-label={`Rol de ${nombre}`}
                                        >
                                            <option value="editor">{ETIQUETA_ROL.editor}</option>
                                            <option value="lector">{ETIQUETA_ROL.lector}</option>
                                        </select>
                                    ) : (
                                        <span className={`miembros-insignia miembros-insignia--${m.rol}`}>
                                            {ETIQUETA_ROL[m.rol]}
                                        </span>
                                    )}

                                    {puedeQuitar && (
                                        <button
                                            type="button"
                                            className="miembros-item__quitar"
                                            disabled={ocupado}
                                            onClick={() => quitar(m)}
                                            title={propio ? 'Abandonar el proyecto' : `Quitar a ${nombre}`}
                                            aria-label={propio ? 'Abandonar el proyecto' : `Quitar a ${nombre}`}
                                        >
                                            {propio ? 'Salir' : '×'}
                                        </button>
                                    )}
                                </li>
                            );
                        })}

                        {puedeInvitar && invitacionesVisibles.map((inv) => (
                            <li key={`inv-${inv.idInvitacion}`} className="miembros-item miembros-item--pendiente">
                                <span className="miembros-item__avatar" aria-hidden="true">
                                    {iniciales(inv.mail)}
                                </span>
                                <span className="miembros-item__nombre">
                                    {inv.mail}
                                </span>
                                <span className="miembros-insignia miembros-insignia--pendiente">
                                    Esperando confirmación
                                </span>
                                <button
                                    type="button"
                                    className="miembros-item__quitar"
                                    disabled={ocupado}
                                    onClick={() => void cancelarInvitacion(inv)}
                                    title="Cancelar invitación"
                                    aria-label={`Cancelar invitación a ${inv.mail}`}
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>

                    {puedeInvitar && (
                        <div className="miembros-agregar">
                            <label className="miembros-agregar__titulo" htmlFor="miembro-mail">
                                Invitar por mail
                            </label>
                            <div className="miembros-agregar__fila">
                                <input
                                    id="miembro-mail"
                                    type="email"
                                    placeholder="mail@ejemplo.com"
                                    value={mail}
                                    onChange={(e) => setMail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !ocupado && invitar()}
                                />
                                <select
                                    value={rolNuevo}
                                    onChange={(e) => setRolNuevo(e.target.value as RolEditable)}
                                    aria-label="Rol del nuevo miembro"
                                >
                                    <option value="editor">{ETIQUETA_ROL.editor}</option>
                                    <option value="lector">{ETIQUETA_ROL.lector}</option>
                                </select>
                                <button type="button" className="miembros-agregar__boton" onClick={invitar} disabled={ocupado}>
                                    {ocupado ? 'Enviando…' : 'Invitar'}
                                </button>
                            </div>
                        </div>
                    )}

                    {aviso && <p className="miembros-aviso" role="status">{aviso}</p>}
                    {error && <p className="miembros-error" role="alert">{error}</p>}
                </section>
            )}
        </div>
    );
}