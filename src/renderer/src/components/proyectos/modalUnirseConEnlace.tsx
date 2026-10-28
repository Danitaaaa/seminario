import { useState } from 'react';
import { Boton } from '../comunes/boton';

interface Props {
    onUnirse: (enlace: string) => Promise<void>;
    onCancelar: () => void;
}

const limpiar = (e: unknown) =>
    (e instanceof Error ? e.message : 'Ocurrió un error')
        .replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

export function ModalUnirseConEnlace({ onUnirse, onCancelar }: Props) {
    const [enlace, setEnlace] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const enviar = async () => {
        if (ocupado) return;
        const limpio = enlace.trim();
        if (!limpio) return setError('Pegá el enlace que te llegó por mail.');
        setOcupado(true);
        setError(null);
        try {
            await onUnirse(limpio);
        } catch (e) {
            setError(limpiar(e));
            setOcupado(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onCancelar}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3 className="modal__titulo">Unirme con enlace</h3>
                <p className="modal__texto">Pegá el enlace de la invitación que recibiste por mail.</p>
                <input
                    type="text"
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    value={enlace}
                    placeholder="Pegá el enlace acá"
                    onChange={(e) => setEnlace(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void enviar()}
                />
                {error && <p className="miembros-error" role="alert">{error}</p>}
                <div className="modal__acciones">
                    <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
                    <Boton variante="primario" onClick={() => void enviar()}>
                        {ocupado ? 'Uniéndome…' : 'Unirme'}
                    </Boton>
                </div>
            </div>
        </div>
    );
}