import { useState } from 'react';
import { Boton } from '../comunes/boton';
import type { Carpeta } from '../../types/nodo';
import type { OpcionMateria } from '../../types/materias';

interface ModalEditarCarpetaProps {
    carpeta: Carpeta;
    materias: OpcionMateria[];
    onGuardar: (nombre: string, idMateria: number | null) => void;
    onCancelar: () => void;
}

// Edita una carpeta de Material: el nombre y la materia a la que pertenece (o ninguna).
export function ModalEditarCarpeta({ carpeta, materias, onGuardar, onCancelar }: ModalEditarCarpetaProps) {
    const [nombre, setNombre] = useState(carpeta.nombre);
    const [idMateria, setIdMateria] = useState<number | ''>(carpeta.idMateria ?? '');

    // Las materias se muestran agrupadas por formación y año, en el orden en que llegan.
    const grupos = materias.reduce<{ grupo: string; materias: OpcionMateria[] }[]>((acc, m) => {
        const ultimo = acc[acc.length - 1];
        if (ultimo && ultimo.grupo === m.grupo) ultimo.materias.push(m);
        else acc.push({ grupo: m.grupo, materias: [m] });
        return acc;
    }, []);

    const confirmar = () => {
        const limpio = nombre.trim();
        if (limpio) onGuardar(limpio, idMateria === '' ? null : idMateria);
    };

    return (
        <div className="modal-overlay" onClick={onCancelar}>
            <div className="modal modal--editar-carpeta" role="dialog" aria-modal="true" aria-labelledby="titulo-editar-carpeta" onClick={(e) => e.stopPropagation()}>
                <h3 className="modal__titulo" id="titulo-editar-carpeta">Editar carpeta</h3>

                <label className="modal__campo">
                    Nombre
                    <input
                        className="modal__input"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && confirmar()}
                        autoFocus
                        maxLength={250}
                    />
                </label>

                <label className="modal__campo">
                    Materia
                    <select className="modal__input" value={idMateria} onChange={(e) => setIdMateria(e.target.value === '' ? '' : Number(e.target.value))}>
                        <option value="">Sin materia</option>
                        {grupos.map((g) => (
                            <optgroup key={g.grupo} label={g.grupo}>
                                {g.materias.map((m) => <option key={m.idMateria} value={m.idMateria}>{m.nombre}</option>)}
                            </optgroup>
                        ))}
                    </select>
                </label>
                {materias.length === 0 && (
                    <p className="modal__texto">Todavía no cargaste materias. Podés hacerlo desde la sección Materias.</p>
                )}

                <div className="modal__acciones">
                    <Boton variante="contorno" onClick={onCancelar}>Cancelar</Boton>
                    <Boton onClick={confirmar}>Guardar</Boton>
                </div>
            </div>
        </div>
    );
}
