import {
    proximaClase, proximoEvento, resumenMetas, textoDia, saludoSegunHora, fechaLarga,
} from '../../../renderer/src/utils/proximos';
import type { HorarioCursado } from '../../../renderer/src/types/horarios';
import type { Evento } from '../../../renderer/src/types/eventos';
import type { Meta } from '../../../renderer/src/types/metas';


const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};


// Momento fijo para que el test no dependa del día en que se corre: sábado 24/10/2026, 07:30.
const AHORA = new Date(2026, 9, 24, 7, 30);

const horario = (diaSemana: number, horaInicio: string, horaFin: string, titulo: string): HorarioCursado =>
    ({ id: 1, usuarioId: 12, diaSemana, horaInicio, horaFin, titulo, tono: null });

const evento = (titulo: string, fecha: Date): Evento => ({
    id: 1, usuarioId: 12, titulo, descripcion: null, lugar: null, fecha,
    idProyecto: null, nombreProyecto: null,
    categoria: 'Parciales', prioridad: 'media', notificacionesActivas: false, recordatorios: [],
});

const meta = (titulo: string, completada: boolean): Meta =>
    ({ idMeta: 1, idProyecto: null, descripcion: null, mes: '2026-10', fechaCompletada: null, completadaPor: null,
      orden: 1, creadaPor: 12, trasladadaA: null, idMetaOrigen: null, titulo, fechaLimite: null, completada, fechaCreacion: '' });

const texto = (t: { etiqueta: string; titulo: string; detalle: string } | null) =>
    t ? `${t.etiqueta} | ${t.titulo} | ${t.detalle}` : 'null';


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


    await caso(1, 'Saludo y fecha del momento', 'Buenos días | Sábado 24 de octubre', () =>
        `${saludoSegunHora(AHORA)} | ${fechaLarga(AHORA)}`);


    await caso(2, 'Elegir la clase más cercana de la semana', 'Próxima clase | Comunicación de datos | Lunes, 09:00', () =>
        texto(proximaClase([
            horario(4, '18:00', '20:00', 'Análisis'),
            horario(1, '09:00', '11:00', 'Comunicación de datos'),
        ], AHORA)));


    await caso(3, 'Una clase de hoy que ya terminó pasa a la semana siguiente', 'Próxima clase | Química | 31 de octubre, 06:00', () =>
        texto(proximaClase([horario(6, '06:00', '07:00', 'Química')], AHORA)));


    await caso(4, 'Mostrar la clase que está en curso', 'Clase en curso | Física | Ahora, hasta las 09:00', () =>
        texto(proximaClase([horario(6, '07:00', '09:00', 'Física'), horario(6, '10:00', '12:00', 'Historia')], AHORA)));


    await caso(5, 'Sin horarios no hay tarjeta de clase', 'null', () => texto(proximaClase([], AHORA)));


    await caso(6, 'Ignorar eventos que ya pasaron', 'Próximo evento | Parcial de Análisis | Jueves, 10:00', () =>
        texto(proximoEvento([
            evento('Entrega vieja', new Date(2026, 9, 20, 10, 0)),
            evento('Parcial de Análisis', new Date(2026, 9, 29, 10, 0)),
        ], AHORA)));


    await caso(7, 'Evento de todo el día muestra solo la fecha', 'Próximo evento | Feriado | Mañana', () =>
        texto(proximoEvento([evento('Feriado', new Date(2026, 9, 25, 0, 0))], AHORA)));


    await caso(8, 'Contar metas pendientes y mostrar la que sigue', 'Metas pendientes | 2 de 3 sin tachar | Sigue: Ejercicios', () =>
        texto(resumenMetas([meta('Leer', true), meta('Ejercicios', false), meta('Resumen', false)])));


    await caso(9, 'Felicitar cuando están todas tachadas', 'Mis metas | ¡Todas tachadas! | 2 de 2 cumplidas', () =>
        texto(resumenMetas([meta('Leer', true), meta('Resumen', true)])));


    await caso(10, 'Fechas lejanas con día y mes', '5 de noviembre', () =>
        textoDia(new Date(2026, 10, 5), AHORA));


    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}


main().catch((error) => {
    console.error('MAL: Error al ejecutar las pruebas:', error);
    process.exitCode = 1;
});