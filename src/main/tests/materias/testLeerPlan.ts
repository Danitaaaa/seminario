import { leerPlanEstudios } from '../../logicaNoPersistente/lectorPlanEstudios/leerPlanEstudios';


const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};

// "Física I/1/primero" por materia, separadas por " | ".
const resumen = (texto: string): string =>
    leerPlanEstudios(texto).map((m) => `${m.nombre}/${m.anio ?? '-'}/${m.cuatrimestre ?? '-'}`).join(' | ');

// Plan de Ingeniería en Sistemas tal como lo devuelve una IA a partir del PDF de la facultad.
const PLAN_UTN = `1.º año
Primer cuatrimestre (1C)
1. Análisis Matemático I.
2. Álgebra y Geometría Analítica.
Segundo cuatrimestre (2C)
3. Física I.
4. Lógica y Estructuras Discretas.
5. Arquitectura de Computadoras.
Anuales (A)
6. Inglés I.
7. Algoritmos y Estructuras de Datos.
8. Sistemas y Procesos de Negocios.
2.º año
Primer cuatrimestre (1C)
9. Análisis Matemático II.
10. Ingeniería y Sociedad.
11. Sistemas Operativos.
Segundo cuatrimestre (2C)
12. Inglés II.
13. Sintaxis y Semántica de los Lenguajes.
14. Paradigmas de Programación.
15. Física II.
Anuales (A)
16. Análisis de Sistemas de Información.
3.º año
Primer cuatrimestre (1C)
17. Economía.
18. Bases de Datos.
19. Desarrollo de Software.
20. Análisis Numérico.
Segundo cuatrimestre (2C)
21. Comunicaciones de Datos.
22. Probabilidad y Estadística.
Anuales (A)
23. Diseño de Sistemas de Información.
Materias electivas
- Paquete de Materias Electivas de 3.er nivel (2C).
4.º año
Materias
24. Legislación.
25. Ingeniería y Calidad de Software.
26. Redes de Datos.
27. Investigación Operativa.
28. Simulación.
29. Tecnologías para la Automatización.
30. Administración de Sistemas de Información.
Materias electivas
- Paquete de Materias Electivas de 4.º nivel.
Título intermedio
- Habilitación Profesional (Título Intermedio).
5.º año
Materias
31. Inteligencia Artificial.
32. Ciencia de Datos.
33. Sistemas de Gestión.
34. Gestión Gerencial.
35. Seguridad en los Sistemas de Información.
36. Proyecto Final.
Materias electivas
- Paquete de Materias Electivas de 5.º nivel.
Práctica
- Práctica Profesional Supervisada (PPS).`;


async function main(): Promise<void> {
    let bien = 0;
    let mal = 0;

    const caso = async (id: number, nombre: string, esperada: string, prueba: () => Promise<string> | string) => {
        console.log(`\nID: ${id}\nNombre: ${nombre}\nSalida esperada: ${esperada}`);
        try {
            const obtenida = await prueba();
            comprobar(obtenida === esperada, `Se obtuvo "${obtenida}"`);
            bien++;
            console.log(`Salida obtenida: ${obtenida}\nBIEN: ${nombre}`);
        } catch (error) {
            mal++;
            console.error(`Salida obtenida: ${String(error)}\nMAL: ${nombre}`);
        }
    };

    await caso(1, 'Reconocer títulos de año y cuatrimestre', 'Álgebra/1/primero | Análisis I/1/primero | Física I/1/segundo', () =>
        resumen('Primer año\nPrimer cuatrimestre\nÁlgebra\nAnálisis I\nSegundo cuatrimestre\nFísica I'));

    await caso(2, 'Reconocer distintas formas de escribir el año', 'Física I/1/- | Física II/2/- | Economía/3/- | Legislación/4/-', () =>
        resumen('1.º año\nFísica I\n2do año\nFísica II\nAño 3\nEconomía\n4° año\nLegislación'));

    await caso(3, 'Reconocer "Anuales (A)", "(1C)" y "(2C)" como títulos', 'Inglés I/1/anual | Álgebra/1/primero | Física I/1/segundo', () =>
        resumen('1° año\nAnuales (A)\nInglés I\nPrimer cuatrimestre (1C)\nÁlgebra\nSegundo cuatrimestre (2C)\nFísica I'));

    await caso(4, 'Tomar el cuatrimestre escrito en la misma línea', 'Física II/2/segundo | Sistemas Operativos/2/primero | Ingeniería y Sociedad/2/anual', () =>
        resumen('2do año\nFísica II - 2° cuatrimestre\nSistemas Operativos - 1° cuat\nIngeniería y Sociedad - Anual'));

    await caso(5, 'Sacar numeración, viñetas, horas y punto final', 'Física I | Inglés I | Química General', () =>
        leerPlanEstudios('3. Física I (96 hs).\n- Inglés I.\n• Química General (6 hs)').map((m) => m.nombre).join(' | '));

    await caso(6, 'Ignorar encabezados y subtítulos que no son materias', 'Redes de Datos | Simulación', () =>
        leerPlanEstudios('PLAN DE ESTUDIOS 2023\nCódigo\tMateria\tHoras\nMaterias electivas\nRedes de Datos\nTítulo intermedio\nPráctica\nSimulación')
            .map((m) => m.nombre).join(' | '));

    await caso(7, 'No repetir una materia que aparece dos veces', '1', () =>
        String(leerPlanEstudios('Física I\nFÍSICA I\nfisica i').length));

    await caso(8, 'Leer el plan completo de Ingeniería en Sistemas (UTN)', '41 materias | 1°: 8 | 2°: 8 | 3°: 8 | 4°: 9 | 5°: 8', () => {
        const materias = leerPlanEstudios(PLAN_UTN);
        const porAnio = [1, 2, 3, 4, 5].map((a) => `${a}°: ${materias.filter((m) => m.anio === a).length}`).join(' | ');
        return `${materias.length} materias | ${porAnio}`;
    });

    await caso(9, 'Sin títulos, las materias quedan sin año ni cuatrimestre', 'Física I/-/- | Química/-/-', () =>
        resumen('Física I\nQuímica'));

    await caso(10, 'Un texto sin materias no devuelve nada', '0', () =>
        String(leerPlanEstudios('Primer año\n\nSegundo cuatrimestre\n  \n').length));

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
