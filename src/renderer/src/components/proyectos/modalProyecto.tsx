import { useState } from 'react';
import type { FormEvent } from 'react';

export interface DatosProyecto {
    nombre: string;
    numeroProyecto: string;
    materiaAsociada?: string;
    fechaFin?: string; // YYYY-MM-DD
}

interface ModalProyectoProps {
    onCancelar: () => void;
    onGuardar: (datos: DatosProyecto) => Promise<void>;
}

export function ModalProyecto({ onCancelar, onGuardar }: ModalProyectoProps) {
    const [nombre, setNombre] = useState('');
    const [numeroProyecto, setNumeroProyecto] = useState('');
    const [materiaAsociada, setMateriaAsociada] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const enviar = async (evento: FormEvent) => {
        evento.preventDefault();
        setGuardando(true);
        setError(null);
        try {
            await onGuardar({
                nombre: nombre.trim(),
                numeroProyecto: numeroProyecto.trim(),
                materiaAsociada: materiaAsociada.trim() || undefined,
            });
        } catch (e) {
            console.error('No se pudo crear el proyecto', e);
            setError('No se pudo crear el proyecto.');
            setGuardando(false);
        }
    };

    return (
        <div className="modal-proyecto__fondo" onClick={onCancelar}>
            <form
                className="modal-proyecto"
                onClick={(e) => e.stopPropagation()}
                onSubmit={enviar}
            >
                <h2>Nuevo proyecto</h2>

                <label>
                    Nombre
                    <input
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        maxLength={100}
                        required
                        autoFocus
                    />
                </label>

                <label>
                    Número de proyecto
                    <input
                        value={numeroProyecto}
                        onChange={(e) => setNumeroProyecto(e.target.value)}
                        maxLength={100}
                        required
                    />
                </label>

                <label>
                    Materia asociada (opcional)
                    <input
                        value={materiaAsociada}
                        onChange={(e) => setMateriaAsociada(e.target.value)}
                        maxLength={100}
                    />
                </label>


                {error && <p className="cartel-error__mensaje">{error}</p>}

                <div className="modal-proyecto__acciones">
                    <button
                        type="button"
                        className="btn-proyecto btn-proyecto--secundario"
                        onClick={onCancelar}
                        disabled={guardando}
                    >
                        Cancelar
                    </button>
                    <button type="submit" className="btn-proyecto" disabled={guardando}>
                        Crear
                    </button>
                </div>
            </form>
        </div>
    );
}