import { pool } from '../../persistencia/baseDeDatos';
import { Persistencia } from '../../persistencia/persistencia';
import { CrearHorario } from '../../logicaPersistente/gestionDeHorarios/crearHorario';
import { ModificarHorario } from '../../logicaPersistente/gestionDeHorarios/modificarHorario';
import { EliminarHorario } from '../../logicaPersistente/gestionDeHorarios/eliminarHorario';
import { ListarHorarios } from '../../logicaPersistente/gestionDeHorarios/listarHorarios';
import { AsignarCuatrimestre } from '../../logicaPersistente/gestionDeHorarios/asignarCuatrimestre';
import { crearHorarioSchema } from '../../logicaPersistente/gestionDeHorarios/dto';

// Tests de horarios de cursada. Usan la base de datos: crean usuarios de prueba y los borran al terminar.
// Se corren con: npx tsx src/main/tests/horarios/testHorarios.ts

const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};

const errorDe = async (accion: () => Promise<unknown>): Promise<string> => {
    try {
        await accion();
        return 'sin error';
    } catch (e) {
        return `Error: ${(e as Error).message}`;
    }
};

const errorSchema = (r: { success: boolean; error?: { issues: { message: string }[] } }): string =>
    r.success ? 'aceptado' : `Error: ${r.error!.issues[0].message}`;

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

async function main(): Promise<void> {
    let bien = 0;
    let mal = 0;
    const caso = async (id: number, nombre: string, esperada: string, prueba: () => Promise<string>) => {
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

    const p = new Persistencia(pool);
    const crear = new CrearHorario(p);
    const modificar = new ModificarHorario(p);
    const listar = new ListarHorarios(p);

    const usuario = async (nombre: string) => (await p.ejecutar<{ id_usuario: number }>(
        `INSERT INTO usuarios (nombre, apellido, apodo, email, password_hash, email_verificado)
         VALUES ($1, 'Horarios', $1, 'horarios' || floor(random() * 1e9) || '@syntra.test', 'x', TRUE) RETURNING id_usuario`,
        [nombre]))[0].id_usuario;
    const cuatrimestre = async (idUsuario: number, tipo: string) => (await p.ejecutar<{ id_cuatrimestre: number }>(
        `INSERT INTO cuatrimestre (id_usuario, anio, tipo, fecha_inicio, fecha_fin)
         VALUES ($1, 2026, $2, $3, $4) RETURNING id_cuatrimestre`,
        [idUsuario, tipo, tipo === 'primero' ? '2026-03-16' : '2026-08-10', tipo === 'primero' ? '2026-07-04' : '2026-11-28']))[0].id_cuatrimestre;

    const usuarioId = await usuario('Prueba');
    const otroUsuario = await usuario('Otra');
    try {
        const primero = await cuatrimestre(usuarioId, 'primero');
        const segundo = await cuatrimestre(usuarioId, 'segundo');
        const ajeno = await cuatrimestre(otroUsuario, 'segundo');
        const horario = (diaSemana: number, horaInicio: string, horaFin: string, titulo: string, idCuatrimestre: number | null, tono?: number) =>
            crearHorarioSchema.parse({ usuarioId, diaSemana, horaInicio, horaFin, titulo, idCuatrimestre, tono });

        let redes = 0;
        await caso(1, 'Crear un horario en un cuatrimestre', 'Redes │ lunes 18:00 a 20:00', async () => {
            const h = await crear.ejecutar(horario(1, '18:00', '20:00', 'Redes', segundo));
            redes = h.id;
            return `${h.titulo} │ ${DIAS[h.diaSemana]} ${h.horaInicio} a ${h.horaFin}`;
        });

        await caso(2, 'Rechazar un horario que termina antes de empezar', 'Error: La hora de fin debe ser posterior a la hora de inicio', async () =>
            errorSchema(crearHorarioSchema.safeParse({ usuarioId, diaSemana: 1, horaInicio: '20:00', horaFin: '18:00', titulo: 'Redes' })));

        await caso(3, 'Rechazar una hora mal escrita', 'Error: La hora debe tener formato HH:MM, ej. 13:00', async () =>
            errorSchema(crearHorarioSchema.safeParse({ usuarioId, diaSemana: 1, horaInicio: '8:00', horaFin: '10:00', titulo: 'Redes' })));

        await caso(4, 'Avisar si se superpone con otro horario del mismo cuatrimestre', 'Error: Ya tenés "Redes" cargado ese día de 18:00 a 20:00.', async () =>
            errorDe(() => crear.ejecutar(horario(1, '19:00', '21:00', 'Simulación', segundo))));

        await caso(5, 'Permitir el mismo día y hora en otro cuatrimestre', 'Simulación │ lunes 19:00 a 21:00', async () => {
            const h = await crear.ejecutar(horario(1, '19:00', '21:00', 'Simulación', primero));
            return `${h.titulo} │ ${DIAS[h.diaSemana]} ${h.horaInicio} a ${h.horaFin}`;
        });

        await caso(6, 'No crear un horario en el cuatrimestre de otro usuario', 'Error: El cuatrimestre no existe.', async () =>
            errorDe(() => crear.ejecutar(horario(3, '08:00', '10:00', 'Física', ajeno))));

        await caso(7, 'Un horario viejo sin cuatrimestre choca con cualquier cuatrimestre', 'Error: Ya tenés "Inglés" cargado ese día de 10:00 a 12:00.', async () => {
            await crear.ejecutar(horario(5, '10:00', '12:00', 'Inglés', null));
            return errorDe(() => crear.ejecutar(horario(5, '11:00', '13:00', 'Química', segundo)));
        });

        await caso(8, 'Elegir un tono pinta todos los bloques de la materia', 'tonos de Redes: 3, 3', async () => {
            await crear.ejecutar(horario(3, '18:00', '20:00', 'Redes', segundo, 3));
            const tonos = (await listar.ejecutar({ usuarioId })).filter((h) => h.titulo === 'Redes').map((h) => h.tono);
            return `tonos de Redes: ${tonos.join(', ')}`;
        });

        await caso(9, 'Modificar solo la hora de fin', 'Redes │ lunes 18:00 a 21:00', async () => {
            const h = await modificar.ejecutar({ id: redes, horaFin: '21:00' });
            return `${h.titulo} │ ${DIAS[h.diaSemana]} ${h.horaInicio} a ${h.horaFin}`;
        });

        await caso(10, 'Rechazar una modificación que deja el fin antes del inicio', 'Error: La hora de fin debe ser posterior a la hora de inicio.', async () =>
            errorDe(() => modificar.ejecutar({ id: redes, horaInicio: '22:00' })));

        await caso(11, 'Rechazar una modificación que se superpone con otro horario', 'Error: Ya tenés "Redes" cargado ese día de 18:00 a 20:00.', async () =>
            errorDe(() => modificar.ejecutar({ id: redes, diaSemana: 3 })));

        await caso(12, 'Listar un cuatrimestre trae sus horarios y los viejos, por día y hora', 'lunes Redes │ miércoles Redes │ viernes Inglés', async () =>
            (await listar.ejecutar({ usuarioId, idCuatrimestre: segundo })).map((h) => `${DIAS[h.diaSemana]} ${h.titulo}`).join(' │ '));

        await caso(13, 'No asignar los horarios viejos a un cuatrimestre de otro usuario', '0 asignados', async () =>
            `${(await new AsignarCuatrimestre(p).ejecutar({ usuarioId, idCuatrimestre: ajeno })).asignados} asignados`);

        await caso(14, 'Asignar los horarios viejos a un cuatrimestre', '1 asignados │ Inglés ya no aparece en el 1C', async () => {
            const { asignados } = await new AsignarCuatrimestre(p).ejecutar({ usuarioId, idCuatrimestre: segundo });
            const enPrimero = (await listar.ejecutar({ usuarioId, idCuatrimestre: primero })).some((h) => h.titulo === 'Inglés');
            return `${asignados} asignados │ Inglés ${enPrimero ? 'sigue en el 1C' : 'ya no aparece en el 1C'}`;
        });

        await caso(15, 'Eliminar un horario', 'quedan 3 horarios', async () => {
            await new EliminarHorario(p).ejecutar({ id: redes });
            return `quedan ${(await listar.ejecutar({ usuarioId })).length} horarios`;
        });
    } finally {
        await p.ejecutar(`DELETE FROM usuarios WHERE id_usuario = ANY($1::int[])`, [[usuarioId, otroUsuario]]);
        await pool.end();
    }

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
