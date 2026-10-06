import { useParams } from 'react-router-dom';
import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';

export function Proximamente() {
    const { id = '' } = useParams();
    return (
        <PlantillaLayout titulo="Próximamente" idActivo={id} usuario={{ nombre: 'Usuario' }}>
            <p>Esta sección todavía está en construcción.</p>
        </PlantillaLayout>
    );
}