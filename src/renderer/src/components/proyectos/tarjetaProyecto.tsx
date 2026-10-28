import { useEffect, useState } from 'react';
import { Check, ImageMinus, ImageUp, Move } from 'lucide-react';
import type { Proyecto } from '../../types/proyectos';
import { obtenerUsuarioId } from '../../../lib/sesion';
import { usarArrastreImagen } from '../../hooks/usarArrastreImagen';
import { usarPosicionPortada } from '../../hooks/usarPosicionPortada';

interface TarjetaProyectoProps {
    proyecto: Proyecto;
    onAbrir: (proyecto: Proyecto) => void;
    onEliminar: (proyecto: Proyecto) => void;
}

const formatearFecha = (iso: string) => new Date(iso).toLocaleDateString('es-AR');

// Saca el prefijo que agrega Electron a los errores que vienen del proceso principal.
const mensajeDe = (error: unknown) =>
    error instanceof Error
        ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
        : 'Ocurrió un error inesperado.';

export function TarjetaProyecto({ proyecto, onAbrir, onEliminar }: TarjetaProyectoProps) {
    const idUsuario = obtenerUsuarioId();
    const inicial = proyecto.nombre.trim().charAt(0).toUpperCase();
    // Si el backend no informa el rol, se muestra igual: los permisos los valida el main.
    const puedeEliminar = !proyecto.rol || proyecto.rol === 'propietario';
    const [portada, setPortada] = useState<string | null>(null);
    const [acomodando, setAcomodando] = useState(false);
    const [error, setError] = useState('');
    const { posicion, cambiarPosicion, centrar } = usarPosicionPortada(proyecto.idProyecto);
    const arrastre = usarArrastreImagen<HTMLDivElement>(portada ?? '', posicion, cambiarPosicion);

    useEffect(() => {
        if (!idUsuario) return;
        window.api.obtenerPortadaProyecto({ idProyecto: proyecto.idProyecto, idUsuario })
            .then(setPortada)
            .catch(() => setPortada(null));
    }, [proyecto.idProyecto, idUsuario]);

    const elegirPortada = async () => {
        if (!idUsuario) return;
        setError('');
        try {
            const nueva = await window.api.elegirPortadaProyecto({ idProyecto: proyecto.idProyecto, idUsuario });
            if (!nueva) return;
            // Una imagen nueva arranca centrada y lista para acomodar.
            setPortada(nueva);
            centrar();
            setAcomodando(true);
        } catch (e) {
            setError(mensajeDe(e));
        }
    };

    const quitarPortada = async () => {
        if (!idUsuario) return;
        setError('');
        try {
            await window.api.quitarPortadaProyecto({ idProyecto: proyecto.idProyecto, idUsuario });
            setPortada(null);
            setAcomodando(false);
            centrar();
        } catch (e) {
            setError(mensajeDe(e));
        }
    };

    const estiloPortada = portada
        ? { backgroundImage: `url("${portada}")`, backgroundPosition: `${arrastre.actual.x}% ${arrastre.actual.y}%` }
        : undefined;

    return (
        <article className="tarjeta-proyecto">
            <div className="tarjeta-proyecto__portada-contenedor">
                {acomodando && portada ? (
                    // Modo acomodar: se arrastra la imagen (o se usan las flechas) para elegir qué parte se ve.
                    <div
                        ref={arrastre.ref}
                        className={`tarjeta-proyecto__portada tarjeta-proyecto__portada--imagen tarjeta-proyecto__portada--acomodando${arrastre.arrastrando ? ' tarjeta-proyecto__portada--arrastrando' : ''}`}
                        style={estiloPortada}
                        role="slider"
                        tabIndex={0}
                        aria-label="Posición de la portada. Usá las flechas para moverla y Escape para terminar."
                        aria-valuetext={`${Math.round(arrastre.actual.x)}% horizontal, ${Math.round(arrastre.actual.y)}% vertical`}
                        {...arrastre.eventos}
                        onKeyDown={(e) => (e.key === 'Escape' || e.key === 'Enter' ? setAcomodando(false) : arrastre.eventos.onKeyDown(e))}
                    >
                        <span className="tarjeta-proyecto__pista">
                            <Move size={14} aria-hidden="true" />
                            Arrastrá para acomodar
                        </span>
                    </div>
                ) : (
                    <button
                        type="button"
                        className={`tarjeta-proyecto__portada${portada ? ' tarjeta-proyecto__portada--imagen' : ''}`}
                        style={estiloPortada}
                        onClick={() => onAbrir(proyecto)}
                        aria-label={`Abrir ${proyecto.nombre}`}
                    >
                        {!portada && <span className="tarjeta-proyecto__inicial" aria-hidden="true">{inicial}</span>}
                    </button>
                )}

                <div className={`tarjeta-proyecto__portada-acciones${acomodando ? ' tarjeta-proyecto__portada-acciones--fijas' : ''}`}>
                    {acomodando ? (
                        <button
                            type="button"
                            className="tarjeta-proyecto__portada-boton tarjeta-proyecto__portada-boton--listo"
                            onClick={() => setAcomodando(false)}
                            title="Listo"
                            aria-label="Terminar de acomodar la portada"
                        >
                            <Check size={16} />
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="tarjeta-proyecto__portada-boton"
                                onClick={elegirPortada}
                                title={portada ? 'Cambiar imagen' : 'Poner una imagen'}
                                aria-label={portada ? 'Cambiar imagen de portada' : 'Poner una imagen de portada'}
                            >
                                <ImageUp size={16} />
                            </button>
                            {portada && (
                                <>
                                    <button
                                        type="button"
                                        className="tarjeta-proyecto__portada-boton"
                                        onClick={() => setAcomodando(true)}
                                        title="Acomodar imagen"
                                        aria-label="Acomodar imagen de portada"
                                    >
                                        <Move size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        className="tarjeta-proyecto__portada-boton"
                                        onClick={quitarPortada}
                                        title="Volver a los colores de la paleta"
                                        aria-label="Quitar imagen de portada"
                                    >
                                        <ImageMinus size={16} />
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="tarjeta-proyecto__cuerpo">
                <header className="tarjeta-proyecto__cabecera">
                    <div>
                        <h3 className="tarjeta-proyecto__titulo">{proyecto.nombre}</h3>
                        <p className="tarjeta-proyecto__fecha">
                            Creado el {formatearFecha(proyecto.fechaCreacion)}
                        </p>
                    </div>
                    {proyecto.rol && <span className="tarjeta-proyecto__rol">{proyecto.rol}</span>}
                </header>

                {error && <p className="tarjeta-proyecto__error">{error}</p>}

                <footer className="tarjeta-proyecto__acciones">
                    {puedeEliminar && (
                        <button
                            type="button"
                            className="btn-proyecto btn-proyecto--peligro"
                            onClick={() => onEliminar(proyecto)}
                        >
                            Eliminar
                        </button>
                    )}
                    <button type="button" className="btn-proyecto" onClick={() => onAbrir(proyecto)}>
                        Abrir
                    </button>
                </footer>
            </div>
        </article>
    );
}