import {
    armarSemana, inicioDeSemana, rangoDeHoras, tituloSemana, ubicarSuperpuestos, fechaISO,
} from '../../../renderer/src/utils/cronograma';
import type { HorarioCursado } from '../../../renderer/src/types/horarios';
import type { Evento } from '../../../renderer/src/types/eventos';
import type { Meta } from '../../../renderer/src/types/metas';


const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};


// Semana fija para que el test no dependa del día: lunes 19 a domingo 25 de octubre de 2026.
const LUNES = new Date(2026, 9, 19);

const horario = (diaSemana: number, horaInicio: string, horaFin: string, titulo: string): HorarioCursado =>
    ({ id: diaSemana, usuarioId: 12, diaSemana, horaInicio, horaFin, titulo });

const evento = (titulo: string, fecha: Date, lugar: string | null = null): Evento => ({
    id: 1, usuarioId: 12, titulo, descripcion: null, lugar, fecha,
    idProyecto: null, nombreProyecto: null,
    categoria: 'Parciales', prioridad: 'media', notificacionesActivas: false, recordatorios: [],
});

const meta = (titulo: string, fechaLimite: string | null): Meta =>
    ({ idMeta: 1, idProyecto: null, descripcion: null, mes: '2026-10', fechaCompletada: null, completadaPor: null,
      orden: 1, creadaPor: 12, trasladadaA: null, idMetaOrigen: null, titulo, fechaLimite, completada: false, fechaCreacion: '' });


async function main(): Promise<void> {
    let bien = 0;
    let mal = 0;
    const caso = async (id: number, nombre: string, esperada: string, prueba: () => string) => {
        console.log(`\nID: ${id}\nNombre: ${nombre}\nSalida esperada: ${esperada}`);
        try {
            const obtenida = prueba();
            comprobar(obtenida === esperada, `Se obtuvo "${obtenida}"`);
            bien++;
            console.log(`Salida obtenida: ${obtenida}\nBIEN: ${nombre}`);
        } catch (error) {
            mal++;
            console.error(`Salida obtenida: ${String(error)}\nMAL: ${nombre}`);
        }
    };


    await caso(1, 'La semana arranca el lunes', '2026-10-19', () =>
        fechaISO(inicioDeSemana(new Date(2026, 9, 24, 12, 0))));


    await caso(2, 'El domingo pertenece a la semana que empezó el lunes anterior', '2026-10-19', () =>
        fechaISO(inicioDeSemana(new Date(2026, 9, 25))));


    await caso(3, 'Título de semana dentro del mismo mes', '19 – 25 de octubre', () => tituloSemana(LUNES));


    await caso(4, 'Título de semana que cruza de mes', '26 de octubre – 1 de noviembre', () =>
        tituloSemana(new Date(2026, 9, 26)));


    await caso(5, 'Cada clase cae en su día de la semana', 'Lun: Comunicación de datos | Jue: Análisis', () => {
        const dias = armarSemana(LUNES, [horario(1, '09:00', '11:00', 'Comunicación de datos'), horario(4, '18:00', '20:00', 'Análisis')], [], []);
        return `Lun: ${dias[0].bloques[0].titulo} | Jue: ${dias[3].bloques[0].titulo}`;
    });


    await caso(6, 'Un evento con hora ocupa una hora y muestra el lugar', 'Parcial | 10:00 · Aula 3 | 600-660', () => {
        const dias = armarSemana(LUNES, [], [evento('Parcial', new Date(2026, 9, 22, 10, 0), 'Aula 3')], []);
        const b = dias[3].bloques[0];
        return `${b.titulo} | ${b.detalle} | ${b.desde}-${b.hasta}`;
    });


    await caso(7, 'Un evento a las 00:00 va arriba, como de todo el día', 'Feriado | 0 bloques', () => {
        const dias = armarSemana(LUNES, [], [evento('Feriado', new Date(2026, 9, 23, 0, 0))], []);
        return `${dias[4].eventosTodoElDia[0].titulo} | ${dias[4].bloques.length} bloques`;
    });


    await caso(8, 'Las metas aparecen en el día de su fecha límite', 'Vie: Preparar exposición | sin fecha: no aparece', () => {
        const dias = armarSemana(LUNES, [], [], [meta('Preparar exposición', '2026-10-23'), meta('Leer', null)]);
        const total = dias.reduce((n, d) => n + d.metas.length, 0);
        return `Vie: ${dias[4].metas[0].titulo} | sin fecha: ${total === 1 ? 'no aparece' : 'aparece'}`;
    });


    await caso(9, 'El rango se amplía si hay algo antes de las 8 o después de las 20', '07:00 a 22:00', () => {
        const dias = armarSemana(LUNES, [horario(1, '07:30', '09:00', 'Temprano'), horario(2, '20:00', '21:30', 'Tarde')], [], []);
        const { desde, hasta } = rangoDeHoras(dias);
        return `0${desde / 60}:00 a ${hasta / 60}:00`;
    });


    await caso(10, 'Dos cosas a la misma hora se ponen una al lado de la otra', 'A col 0/2 | B col 1/2 | C col 0/1', () => {
        const ubicados = ubicarSuperpuestos([
            { id: 1, tipo: 'clase', titulo: 'A', detalle: '', desde: 600, hasta: 720 },
            { id: 2, tipo: 'evento', titulo: 'B', detalle: '', desde: 660, hasta: 720 },
            { id: 3, tipo: 'clase', titulo: 'C', detalle: '', desde: 840, hasta: 960 },
        ]);
        return ubicados.map((b) => `${b.titulo} col ${b.columna}/${b.columnas}`).join(' | ');
    });


    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}


main().catch((error) => {
    console.error('MAL: Error al ejecutar las pruebas:', error);
    process.exitCode = 1;
});