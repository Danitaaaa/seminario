import { useCallback, useEffect, useRef, useState } from 'react';
import type { InvitacionPendiente, Miembro } from '../../types/proyectos';

type RolEditable = 'editor' | 'lector';

interface Props {
    idProyecto: number;
    idUsuarioActual: number;
    miembros: Miembro[];
    onCambio: () => Promise<void> | void;
    onAbandono: () => void;
}

const ETIQUETA_ROL = { propietario: 'Propietario', editor: 'Editor', lector: 'Solo lectura' } as const;

// Colores de avatar, elegidos de forma estable según el usuario.
const PALETA = [
    { fondo: '#e3e8f7', texto: '#2b3a67' },
    { fondo: '#fde9c9', texto: '#8a5a12' },
    { fondo: '#dff1e4', texto: '#2f6b45' },
    { fondo: '#f6dfe6', texto: '#8c3552' },
    { fondo: '#e9e2f5', texto: '#5a3f8a' },
];

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

// CAMBIO: semilla estable para el color. Un miembro que solo existe en el servidor
// tiene idUsuario null, así que se usa el mail.
const semilla = (m: Miembro) =>
    m.idUsuario ?? [...m.mail].reduce((acc, c) => acc + c.charCodeAt(0), 0);

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
    const [abierto, setAbierto] = useState(false);
    const [mail, setMail] = useState('');
    const [rolNuevo, setRolNuevo] = useState<RolEditable>('editor');
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [invitaciones, setInvitaciones] = useState<InvitacionPendiente[]>([]);
    const raiz = useRef<HTMLDivElement>(null);

    // CAMBIO: defensivo, por si llega algún miembro dado de baja.
    const activos = miembros.filter((m) => m.activo !== false);

    const esPropietario = activos.some((m) => m.idUsuario === idUsuarioActual && m.rol === 'propietario');

    // CAMBIO: si el servidor ya lista a alguien como pendiente, no se repite desde la tabla de invitaciones.
    const mailsListados = new Set(activos.map((m) => m.mail.toLowerCase()));
    const invitacionesVisibles = invitaciones.filter((inv) => !mailsListados.has(inv.mail.toLowerCase()));

    const cerrar = () => {
        setAbierto(false);
        setError(null);
        setAviso(null);
    };

    const cargarInvitaciones = useCallback(async () => {
        if (!esPropietario) return setInvitaciones([]);
        try {
            setInvitaciones(
                await window.api.listarInvitaciones({ idProyecto, idUsuarioSolicitante: idUsuarioActual }),
            );
        } catch (e) {
            console.error(e);
            setError(limpiar(e));
        }
    }, [esPropietario, idProyecto, idUsuarioActual]);

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
        void ejecutar(
            () => window.api.agregarMiembroPorMail({
                idProyecto, idUsuarioSolicitante: idUsuarioActual, mail: limpio, rol: rolNuevo,
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
    const quitar = (m: Miembro) => {
        const propio = m.idUsuario === idUsuarioActual;
        const texto = propio ? '¿Abandonar el proyecto?' : `¿Quitar a ${nombreDe(m)} del proyecto?`;
        if (!window.confirm(texto)) return;
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
                            const color = PALETA[semilla(m) % PALETA.length];
                            const editable = esPropietario && m.rol !== 'propietario' && !m.pendiente;
                            const puedeQuitar = m.rol !== 'propietario' && (esPropietario || propio);
                            return (
                                <li
                                    key={m.mail}
                                    className={`miembros-item${m.pendiente ? ' miembros-item--pendiente' : ''}`}
                                >
                                    <span
                                        className="miembros-item__avatar"
                                        style={{ background: color.fondo, color: color.texto }}
                                        aria-hidden="true"
                                    >
                                        {iniciales(nombre)}
                                    </span>

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

                        {esPropietario && invitacionesVisibles.map((inv) => (
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

                    {esPropietario && (
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