import type { Persistencia } from '../../persistencia/persistencia';
import { ItemsParaCalendario } from '../../logicaPersistente/gestionDeCalendarioGoogle/itemsParaCalendario';
import type { ItemCalendario } from '../../logicaPersistente/gestionDeCalendarioGoogle/entidades';
import { aEventoGoogle, idGoogle, sincronizarCalendario } from '../../logicaNoPersistente/calendarioGoogle/sincronizarCalendario';
import type { ClienteCalendar } from '../../logicaNoPersistente/calendarioGoogle/clienteCalendar';

// Tests de la copia a Google Calendar (sin conectarse a Google: el cliente es falso).
// Se corren con: npx tsx src/main/tests/calendarioGoogle/testCalendarioGoogle.ts

const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};

function persistenciaFalsa(respuestas: unknown[][]) {
    const llamadas: [string, unknown[]][] = [];
    const persistencia = {
        async ejecutar(sql: string, valores: unknown[] = []) {
            llamadas.push([sql, valores]);
            return respuestas[llamadas.length - 1] ?? [];
        },
    } as unknown as Persistencia;
    return { persistencia, llamadas };
}

// Cliente de Google falso: arranca con los eventos que "ya están" y anota lo que se guarda o borra.
function clienteFalso(yaEstan: { id: string; huella: string | null }[], fallaCon?: string) {
    const guardados: string[] = [];
    const borrados: string[] = [];
    const cliente = {
        async listarEventos() {
            return yaEstan;
        },
        async guardarEvento(_cal: string, id: string) {
            if (id === fallaCon) throw new Error('Google no responde');
            guardados.push(id);
        },
        async borrarEvento(_cal: string, id: string) {
            borrados.push(id);
        },
    } as unknown as ClienteCalendar;
    return { cliente, guardados, borrados };
}

const ZONA = 'America/Argentina/Buenos_Aires';
const parcial: ItemCalendario = {
    clave: 'ev12',
    titulo: 'Parcial de Probabilidad',
    descripcion: 'Parciales',
    lugar: 'Aula 5',
    inicio: new Date(2026, 10, 25, 14, 0),
    fin: new Date(2026, 10, 25, 15, 0),
    color: '11',
};
const huellaDe = (item: ItemCalendario) =>
    (aEventoGoogle(item, ZONA).extendedProperties as { private: { huella: string } }).private.huella;

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

    const ahora = new Date(2026, 10, 21, 10, 0); // sábado 21/11/2026
    const respuestas = [
        [{ id: 12, titulo: 'Parcial de Probabilidad', descripcion: null, lugar: 'Aula 5', fecha: new Date(2026, 10, 25, 14), categoria: 'Parciales', prioridad: 'importante', proyecto: null }],
        [{ id: 40, nombre: 'Repaso Poisson', fecha_programada: new Date(2026, 10, 22, 9), duracion: 90, materia: 'Probabilidad', metodos: 'Flashcards', objetivos: '- Ejercicios 1 a 5' }],
        [{ id: 3, dia_semana: 1, hora_inicio: '18:00', hora_fin: '20:00', titulo: 'Redes',
           fecha_inicio: '2026-08-10', fecha_fin: '2026-11-28', recesos: [{ desde: '2026-10-12', hasta: '2026-10-12' }] }],
        [{ id: 7, titulo: 'Terminar TP', descripcion: null, fecha_limite: new Date(2026, 10, 30) }],
    ];
    const { persistencia, llamadas } = persistenciaFalsa(respuestas);
    const items = await new ItemsParaCalendario(persistencia).ejecutar(1, ahora);
    const porClave = new Map(items.map((i) => [i.clave, i]));

    await caso(1, 'Arma un elemento por evento, sesión, clase y meta', 'ev12, se40, cl3, me7', () =>
        items.map((i) => i.clave).join(', '));

    await caso(2, 'Solo busca del último mes al próximo año', 'desde 22/10/2026 hasta 21/11/2027', () => {
        const [, desde, hasta] = llamadas[0][1] as [number, Date, Date];
        return `desde ${desde.toLocaleDateString('es-AR')} hasta ${hasta.toLocaleDateString('es-AR')}`;
    });

    await caso(3, 'Un parcial va en rojo, dura una hora y se marca importante', 'color 11 | 60 min | Parciales · importante', () => {
        const e = porClave.get('ev12')!;
        return `color ${e.color} | ${(e.fin.getTime() - e.inicio.getTime()) / 60000} min | ${e.descripcion.split('\n')[0]}`;
    });

    await caso(4, 'La sesión dura lo planificado y lleva métodos y objetivos', 'Estudiar Probabilidad: Repaso Poisson | 90 min | Métodos: Flashcards', () => {
        const s = porClave.get('se40')!;
        comprobar(s.descripcion.includes('- Ejercicios 1 a 5'), 'Faltan los objetivos');
        return `${s.titulo} | ${(s.fin.getTime() - s.inicio.getTime()) / 60000} min | ${s.descripcion.split('\n')[1]}`;
    });

    await caso(5, 'La clase del lunes arranca el primer lunes de la cursada y se repite', 'lunes 10/8/2026 18:00 a 20:00 | semanal', () => {
        const c = porClave.get('cl3')!;
        const hora = (f: Date) => `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
        return `lunes ${c.inicio.toLocaleDateString('es-AR')} ${hora(c.inicio)} a ${hora(c.fin)} | ${c.semanal ? 'semanal' : 'una vez'}`;
    });

    await caso(6, 'La meta es de todo el día, en la fecha límite', 'Meta: Terminar TP | 2026-11-30 a 2026-12-01', () => {
        const ev = aEventoGoogle(porClave.get('me7')!, ZONA) as { summary: string; start: { date: string }; end: { date: string } };
        return `${ev.summary} | ${ev.start.date} a ${ev.end.date}`;
    });

    await caso(7, 'Los eventos de Google no traen recordatorios (los da Syntra)', 'sin recordatorios', () => {
        const ev = aEventoGoogle(parcial, ZONA) as { reminders: { useDefault: boolean; overrides: unknown[] } };
        return !ev.reminders.useDefault && ev.reminders.overrides.length === 0 ? 'sin recordatorios' : 'con recordatorios';
    });

    await caso(8, 'La clase se repite cada semana hasta el fin de la cursada (28/11, hora argentina)', 'RRULE:FREQ=WEEKLY;UNTIL=20261129T025959Z', () =>
        String((aEventoGoogle(porClave.get('cl3')!, ZONA).recurrence as string[])[0]));

    await caso(14, 'El feriado del 12/10 no tiene clase', 'EXDATE;TZID=America/Argentina/Buenos_Aires:20261012T180000', () =>
        String((aEventoGoogle(porClave.get('cl3')!, ZONA).recurrence as string[])[1]));

    await caso(15, 'Un evento que no se repite no lleva reglas de repetición', 'sin recurrence', () =>
        ('recurrence' in aEventoGoogle(parcial, ZONA) ? 'con recurrence' : 'sin recurrence'));

    await caso(9, 'El id para Google usa solo letras y números permitidos', 'sntrev12 | válido', () => {
        const id = idGoogle('ev12');
        return `${id} | ${/^[a-v0-9]{5,1024}$/.test(id) ? 'válido' : 'inválido'}`;
    });

    await caso(10, 'La huella cambia si cambia el evento y no si es igual', 'igual | distinta', () => {
        const igual = huellaDe(parcial) === huellaDe({ ...parcial });
        const otra = huellaDe(parcial) === huellaDe({ ...parcial, lugar: 'Aula 7' });
        return `${igual ? 'igual' : 'distinta'} | ${otra ? 'igual' : 'distinta'}`;
    });

    await caso(11, 'Sincronizar: crea lo nuevo, no toca lo igual y borra lo que ya no está', 'guardados: sntrse40 | borrados: sntrev99 | sin cambios: 1', async () => {
        const sesion = porClave.get('se40')!;
        const { cliente, guardados, borrados } = clienteFalso([
            { id: 'sntrev12', huella: huellaDe(parcial) },
            { id: 'sntrev99', huella: 'vieja' },
        ]);
        const r = await sincronizarCalendario(cliente, 'cal', [parcial, sesion], ZONA);
        return `guardados: ${guardados.join(',')} | borrados: ${borrados.join(',')} | sin cambios: ${r.sinCambios}`;
    });

    await caso(12, 'Sincronizar: un evento modificado se vuelve a subir', '1 actualizado', async () => {
        const { cliente } = clienteFalso([{ id: 'sntrev12', huella: huellaDe(parcial) }]);
        const r = await sincronizarCalendario(cliente, 'cal', [{ ...parcial, titulo: 'Parcial de Probabilidad (cambió el aula)' }], ZONA);
        return `${r.creadosOActualizados} actualizado`;
    });

    await caso(13, 'Sincronizar: si falla uno, sigue con los demás', '1 fallido, 1 guardado', async () => {
        const sesion = porClave.get('se40')!;
        const { cliente, guardados } = clienteFalso([], 'sntrev12');
        const r = await sincronizarCalendario(cliente, 'cal', [parcial, sesion], ZONA);
        return `${r.fallidos} fallido, ${guardados.length} guardado`;
    });

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
