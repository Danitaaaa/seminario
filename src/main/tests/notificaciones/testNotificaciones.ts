import type { Persistencia } from '../../persistencia/persistencia';
import { CrearNotificacion } from '../../logicaPersistente/gestionDeNotificaciones/crearNotificacion';
import { MarcarLeidas } from '../../logicaPersistente/gestionDeNotificaciones/marcarLeidas';
import { CambiarSilencio } from '../../logicaPersistente/gestionDeNotificaciones/silencio';
import { crearNotificacionSchema } from '../../logicaPersistente/gestionDeNotificaciones/dto';
import { avisosPendientes } from '../../logicaNoPersistente/notificaciones/avisosPendientes';
import { Notificador } from '../../logicaNoPersistente/notificaciones/notificador';
import { VigiaNotificaciones } from '../../logicaNoPersistente/notificaciones/vigiaNotificaciones';
import type { Notificacion } from '../../logicaPersistente/gestionDeNotificaciones/entidades';
import type { Evento } from '../../logicaPersistente/gestionDeEventos/entidades';
import type { Meta } from '../../logicaPersistente/gestionDeMetas/entidades';
import { tiempoRelativo, textoContador } from '../../../renderer/src/utils/notificaciones';


const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};


async function esperarError(accion: () => Promise<unknown>, esperado: string): Promise<void> {
    try {
        await accion();
    } catch (error) {
        comprobar(error instanceof Error && error.message === esperado,
            `Se esperaba "${esperado}" y se recibió "${String(error)}"`);
        return;
    }
    throw new Error(`Se esperaba el error "${esperado}"`);
}


// Simula la base: guarda las consultas y responde con las filas indicadas.
function crearPersistencia(filas: unknown[] = []) {
    const consultas: { sql: string; valores: unknown[] }[] = [];
    const persistencia = {
        async ejecutar(sql: string, valores: unknown[] = []) {
            consultas.push({ sql, valores });
            return filas;
        },
    } as unknown as Persistencia;
    return { persistencia, consultas };
}

// Sábado 24/10/2026 a las 12:00
const AHORA = new Date(2026, 9, 24, 12, 0);

const evento = (cambios: Partial<Evento> = {}): Evento => ({
    id: 7, usuarioId: 12, titulo: 'Parcial de Análisis', descripcion: null, lugar: 'Aula 3',
    fecha: new Date(2026, 9, 24, 12, 30), idProyecto: null, nombreProyecto: null, categoria: 'Parciales', prioridad: 'importante',
    notificacionesActivas: true, recordatorios: [{ cantidad: 30, unidad: 'minutos' }], ...cambios,
});

const meta = (cambios: Partial<Meta> = {}): Meta => ({
    idMeta: 3, idProyecto: null, descripcion: null, mes: '2026-10', fechaCompletada: null, completadaPor: null,
    orden: 1, creadaPor: 12, trasladadaA: null, idMetaOrigen: null,
    titulo: 'Preparar exposición', fechaLimite: '2026-10-24',
    completada: false, fechaCreacion: new Date(), ...cambios,
});

const notificacion = (id: number): Notificacion => ({
    id, usuarioId: 12, tipo: 'evento', titulo: 'x', mensaje: '', leida: false, fecha: AHORA,
});

// Notificador de prueba: anota lo que mostró en la compu y cuántas veces avisó a la ventana.
function crearNotificador(silenciado: boolean, yaExiste = false) {
    const mostradas: Notificacion[] = [];
    let avisos = 0;
    const notificador = new Notificador(
        {
            crear: async () => (yaExiste ? null : notificacion(1)),
            estaSilenciado: async () => silenciado,
        },
        (n) => mostradas.push(n),
        () => { avisos++; },
    );
    return { notificador, mostradas, avisos: () => avisos };
}


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
            console.log(`MAL: ${nombre} — ${error instanceof Error ? error.message : String(error)}`);
        }
    };


    await caso(1, 'Recordatorio de evento que ya tiene que salir', 'Parcial de Análisis | Es hoy a las 12:30 en Aula 3.', () => {
        const [aviso] = avisosPendientes(12, [evento()], [], AHORA);
        return `${aviso.titulo} | ${aviso.mensaje}`;
    });


    await caso(2, 'Recordatorio que todavía no toca', '0 avisos', () => {
        const avisos = avisosPendientes(12, [evento({ recordatorios: [{ cantidad: 10, unidad: 'minutos' }] })], [], AHORA);
        return `${avisos.length} avisos`;
    });


    await caso(3, 'Evento ya empezado o con notificaciones apagadas no avisa', '0 avisos', () => {
        const avisos = avisosPendientes(12, [
            evento({ fecha: new Date(2026, 9, 24, 11, 0) }),
            evento({ id: 8, notificacionesActivas: false }),
        ], [], AHORA);
        return `${avisos.length} avisos`;
    });


    await caso(4, 'Recordatorio de un día antes para un evento de mañana', 'Es mañana a las 10:00 en Aula 3.', () => {
        const [aviso] = avisosPendientes(12, [evento({
            fecha: new Date(2026, 9, 25, 10, 0), recordatorios: [{ cantidad: 1, unidad: 'dias' }],
        })], [], AHORA);
        return aviso.mensaje;
    });


    await caso(5, 'Meta que vence hoy avisa; completada o de otro día no', '1 aviso: Tu meta vence hoy', () => {
        const avisos = avisosPendientes(12, [], [
            meta(), meta({ idMeta: 4, completada: true }), meta({ idMeta: 5, fechaLimite: '2026-10-25' }), meta({ idMeta: 6, fechaLimite: null }),
        ], AHORA);
        return `${avisos.length} aviso: ${avisos[0].titulo}`;
    });


    await caso(6, 'Un aviso repetido no se vuelve a guardar', 'null', async () => {
        const { persistencia, consultas } = crearPersistencia([]);
        const resultado = await new CrearNotificacion(persistencia).ejecutar({
            usuarioId: 12, tipo: 'meta', titulo: 'Tu meta vence hoy', mensaje: '', clave: 'meta:3:2026-10-24',
        });
        comprobar(consultas[0].sql.includes('ON CONFLICT (usuario_id, clave) DO NOTHING'), 'No evita repetidos');
        return String(resultado);
    });


    await caso(7, 'Sin silenciar: sale en la compu y se avisa a la ventana', '1 en la compu, 1 aviso a la ventana', async () => {
        const n = crearNotificador(false);
        await n.notificador.notificar({ usuarioId: 12, tipo: 'evento', titulo: 'x', mensaje: '', clave: 'k' });
        return `${n.mostradas.length} en la compu, ${n.avisos()} aviso a la ventana`;
    });


    await caso(8, 'Silenciadas: no sale en la compu pero queda en la campanita', '0 en la compu, 1 aviso a la ventana', async () => {
        const n = crearNotificador(true);
        await n.notificador.notificar({ usuarioId: 12, tipo: 'evento', titulo: 'x', mensaje: '', clave: 'k' });
        return `${n.mostradas.length} en la compu, ${n.avisos()} aviso a la ventana`;
    });


    await caso(9, 'Aviso repetido: no molesta de nuevo', '0 en la compu, 0 avisos a la ventana', async () => {
        const n = crearNotificador(false, true);
        await n.notificador.notificar({ usuarioId: 12, tipo: 'evento', titulo: 'x', mensaje: '', clave: 'k' });
        return `${n.mostradas.length} en la compu, ${n.avisos()} avisos a la ventana`;
    });


    await caso(10, 'El vigía revisa al empezar y deja de vigilar al cerrar sesión', '1 aviso, después 0', async () => {
        const n = crearNotificador(false);
        const vigia = new VigiaNotificaciones(
            { eventos: async () => [evento()], metas: async () => [] },
            n.notificador, 60_000, () => AHORA,
        );
        await vigia.vigilar(12);
        const antes = n.mostradas.length;
        vigia.detener();
        await vigia.revisar();
        return `${antes} aviso, después ${n.mostradas.length - antes}`;
    });


    await caso(11, 'Marcar leídas solo toca avisos del propio usuario', 'filtra por usuario 12', async () => {
        const { persistencia, consultas } = crearPersistencia();
        await new MarcarLeidas(persistencia).ejecutar({ usuarioId: 12, ids: [1, 2] });
        await new MarcarLeidas(persistencia).ejecutar({ usuarioId: 12 });
        comprobar(consultas.every((c) => c.sql.includes('usuario_id = $1') && c.valores[0] === 12), 'No filtró por usuario');
        return 'filtra por usuario 12';
    });


    await caso(12, 'Silenciar un usuario que no existe', 'Error: El usuario no existe.', async () => {
        const { persistencia } = crearPersistencia([]);
        await esperarError(() => new CambiarSilencio(persistencia).ejecutar({ usuarioId: 99, silenciadas: true }), 'El usuario no existe.');
        return 'Error: El usuario no existe.';
    });


    await caso(13, 'No se acepta un tipo de aviso desconocido', 'rechazado', () => {
        const r = crearNotificacionSchema.safeParse({ usuarioId: 12, tipo: 'chat', titulo: 'x', clave: 'k' });
        return r.success ? 'aceptado' : 'rechazado';
    });


    await caso(14, 'Hora del aviso y contador de la campanita', 'recién | hace 5 min | hace 3 h | ayer | 20/10 | 9+', () => [
        tiempoRelativo(new Date(2026, 9, 24, 11, 59, 30), AHORA),
        tiempoRelativo(new Date(2026, 9, 24, 11, 55), AHORA),
        tiempoRelativo(new Date(2026, 9, 24, 9, 0), AHORA),
        tiempoRelativo(new Date(2026, 9, 23, 20, 0), AHORA),
        tiempoRelativo(new Date(2026, 9, 20, 9, 0), AHORA),
        textoContador(12),
    ].join(' | '));


    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}


main().catch((error) => {
    console.error('MAL: Error al ejecutar las pruebas:', error);
    process.exitCode = 1;
});