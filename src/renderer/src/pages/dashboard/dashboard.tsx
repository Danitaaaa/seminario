import { PlantillaLayout } from '../plantillaLayout/plantillaLayout';

export function Dashboard() {
    return (
        <PlantillaLayout titulo="Inicio" idActivo="inicio" usuario={{ nombre: 'Usuario' }}>
            <p>¡Bienvenida a Syntra!</p>
        </PlantillaLayout>
    );
}