import { pool } from '../../persistencia/baseDeDatos';
import { Persistencia } from '../../persistencia/persistencia';
import { ListarCuatrimestres } from '../../logicaPersistente/gestionDeMaterias/listarCuatrimestres';
import { GuardarCuatrimestre } from '../../logicaPersistente/gestionDeMaterias/guardarCuatrimestre';
import { EliminarCuatrimestre } from '../../logicaPersistente/gestionDeMaterias/eliminarCuatrimestre';
import { RecursarMateria } from '../../logicaPersistente/gestionDeMaterias/recursarMateria';
import { guardarCuatrimestreSchema } from '../../logicaPersistente/gestionDeMaterias/dto';
import { CrearHorario } from '../../logicaPersistente/gestionDeHorarios/crearHorario';
import { ListarHorarios } from '../../logicaPersistente/gestionDeHorarios/listarHorarios';
import { AsignarCuatrimestre } from '../../logicaPersistente/gestionDeHorarios/asignarCuatrimestre';
import { CrearCuaderno } from '../../logicaPersistente/gestionDeCuadernos/crearCuaderno';
import { ListarCuadernos } from '../../logicaPersistente/gestionDeCuadernos/listarCuadernos';
import { ObtenerCuaderno } from '../../logicaPersistente/gestionDeCuadernos/obtenerCuaderno';
import { ItemsParaCalendario } from '../../logicaPersistente/gestionDeCalendarioGoogle/itemsParaCalendario';

// Tests de cuatrimestres, horarios por cuatrimestre, recursar y cuadernos por cursada. Usan la base de datos:
// crean un usuario de prueba y lo borran al terminar.
// Se corren con: npx tsx src/main/tests/materias/testCuatrimestres.ts

const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};

const errorDe = async (accion: () => Promise<unknown>): Promise<string> => {
    try {
        await accion();
        return 'sin error';
    } catch (e) {
        return (e as Error).message;
    }
};

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
    const listar = new ListarCuatrimestres(p);
    const guardar = new GuardarCuatrimestre(p, listar);
    const listarCuadernos = new ListarCuadernos(p);

    const [{ id_usuario: usuarioId }] = await p.ejecutar<{ id_usuario: number }>(
        `INSERT INTO usuarios (nombre, apellido, apodo, email, password_hash, email_verificado)
         VALUES ('Prueba', 'Cuatrimestres', 'Prueba', 'cuatri' || floor(random() * 1e9) || '@syntra.test', 'x', TRUE) RETURNING id_usuario`);
    const formacion = async (nombre: string) => (await p.ejecutar<{ id_formacion: number }>(
        `INSERT INTO formacion (id_usuario, tipo, nombre) VALUES ($1, 'grado', $2) RETURNING id_formacion`, [usuarioId, nombre]))[0].id_formacion;
    const materia = async (idFormacion: number, nombre: string, estado = 'cursando') => (await p.ejecutar<{ id_materia: number }>(
        `INSERT INTO materia (id_formacion, nombre, estado) VALUES ($1, $2, $3) RETURNING id_materia`,
        [idFormacion, nombre, estado]))[0].id_materia;

    try {
        const sistemas = await formacion('Ing. en sistemas');
        const industrial = await formacion('Ing. industrial');
        const redes = await materia(sistemas, 'Redes', 'libre');
        const proba = await materia(sistemas, 'Probabilidad');
        const probaInd = await materia(industrial, 'Probabilidad');

        const c2025 = await guardar.ejecutar(guardarCuatrimestreSchema.parse({
            usuarioId, anio: 2025, tipo: 'segundo', fechaInicio: '2025-08-11', fechaFin: '2025-11-29',
        }));
        const c2026 = await guardar.ejecutar(guardarCuatrimestreSchema.parse({
            usuarioId, anio: 2026, tipo: 'segundo', fechaInicio: '2026-08-10', fechaFin: '2026-11-28',
            recesos: [{ desde: '2026-10-12', hasta: '2026-10-12', descripcion: 'Feriado' }],
        }));

        await caso(1, 'Crear un cuatrimestre con un feriado', '2° cuatrimestre 2026 | 2026-08-10 → 2026-11-28 | 1 receso', async () =>
            `${c2026.nombre} | ${c2026.fechaInicio} → ${c2026.fechaFin} | ${c2026.recesos.length} receso`);

        await caso(2, 'Cuatrimestre que termina antes de empezar', 'La cursada termina antes de empezar.', async () => {
            const r = guardarCuatrimestreSchema.safeParse({ usuarioId, anio: 2027, tipo: 'primero', fechaInicio: '2027-07-01', fechaFin: '2027-03-01' });
            return r.success ? 'aceptado' : r.error.issues[0].message;
        });

        await caso(3, 'Feriado fuera de la cursada', 'Los feriados y recesos tienen que estar dentro de la cursada.', async () => {
            const r = guardarCuatrimestreSchema.safeParse({
                usuarioId, anio: 2027, tipo: 'primero', fechaInicio: '2027-03-15', fechaFin: '2027-07-03',
                recesos: [{ desde: '2027-08-01', hasta: '2027-08-01' }],
            });
            return r.success ? 'aceptado' : r.error.issues[0].message;
        });

        await caso(4, 'Dos cuatrimestres con fechas que se pisan', 'Las fechas se pisan con el 2° cuatrimestre 2026.', async () =>
            errorDe(() => guardar.ejecutar(guardarCuatrimestreSchema.parse({
                usuarioId, anio: 2027, tipo: 'primero', fechaInicio: '2026-11-01', fechaFin: '2027-03-01',
            }))));

        await caso(5, 'El mismo cuatrimestre dos veces', 'Ya tenés cargado ese cuatrimestre de 2026.', async () =>
            errorDe(() => guardar.ejecutar(guardarCuatrimestreSchema.parse({
                usuarioId, anio: 2026, tipo: 'segundo', fechaInicio: '2026-12-01', fechaFin: '2026-12-20',
            }))));

        const crearHorario = new CrearHorario(p);
        await crearHorario.ejecutar({ usuarioId, diaSemana: 1, horaInicio: '18:00', horaFin: '20:00', titulo: 'Redes', idCuatrimestre: c2025.idCuatrimestre, idMateria: redes });
        await crearHorario.ejecutar({ usuarioId, diaSemana: 3, horaInicio: '18:00', horaFin: '20:00', titulo: 'Probabilidad', idCuatrimestre: c2026.idCuatrimestre, idMateria: proba });
        await crearHorario.ejecutar({ usuarioId, diaSemana: 5, horaInicio: '08:00', horaFin: '10:00', titulo: 'Inglés', idCuatrimestre: null, idMateria: null });

        await caso(6, 'El mismo horario en otro cuatrimestre no se pisa', 'sin error', async () =>
            errorDe(() => crearHorario.ejecutar({ usuarioId, diaSemana: 1, horaInicio: '18:00', horaFin: '20:00', titulo: 'Física', idCuatrimestre: c2026.idCuatrimestre, idMateria: null })));

        await caso(7, 'En el mismo cuatrimestre sí se pisa', 'Ya tenés "Física" cargado ese día de 18:00 a 20:00.', async () =>
            errorDe(() => crearHorario.ejecutar({ usuarioId, diaSemana: 1, horaInicio: '19:00', horaFin: '21:00', titulo: 'Otra', idCuatrimestre: c2026.idCuatrimestre, idMateria: null })));

        await caso(8, 'Horarios de un cuatrimestre (más los viejos sin cuatrimestre)', 'Física, Probabilidad, Inglés', async () =>
            (await new ListarHorarios(p).ejecutar({ usuarioId, idCuatrimestre: c2026.idCuatrimestre })).map((h) => h.titulo).join(', '));

        await caso(9, 'Pasar los horarios viejos a un cuatrimestre', '1 asignado | 0 sin cuatrimestre', async () => {
            const { asignados } = await new AsignarCuatrimestre(p).ejecutar({ usuarioId, idCuatrimestre: c2026.idCuatrimestre });
            const [{ n }] = await p.ejecutar<{ n: number }>(`SELECT count(*)::int AS n FROM horarios_cursado WHERE usuario_id = $1 AND id_cuatrimestre IS NULL`, [usuarioId]);
            return `${asignados} asignado | ${n} sin cuatrimestre`;
        });

        await caso(10, 'Google solo recibe las clases de cuatrimestres vigentes (no Redes de 2025)', 'Física, Inglés, Probabilidad', async () => {
            const items = await new ItemsParaCalendario(p).ejecutar(usuarioId, new Date(2026, 10, 21));
            return items.filter((i) => i.clave.startsWith('cl')).map((i) => i.titulo).sort().join(', ');
        });

        await caso(11, 'Cuaderno de una cursada que cuenta para dos carreras', '2C 2026 | Ing. industrial', async () => {
            const { idCuaderno } = await new CrearCuaderno(p).ejecutar({
                usuarioId, nombre: 'Probabilidad', idMateria: proba, idCuatrimestre: c2026.idCuatrimestre, materiasExtra: [probaInd],
            });
            const cuaderno = await new ObtenerCuaderno(p, listarCuadernos).ejecutar({ usuarioId, idCuaderno });
            return `${cuaderno.resumen.cuatrimestre?.corto} | ${cuaderno.cuentaPara.map((m) => m.formacion).join(', ')}`;
        });

        await caso(12, 'Dos cuadernos de la misma materia en el mismo cuatrimestre', 'Esa materia ya tiene un cuaderno en ese cuatrimestre.', async () =>
            errorDe(() => new CrearCuaderno(p).ejecutar({ usuarioId, nombre: 'Otro', idMateria: proba, idCuatrimestre: c2026.idCuatrimestre, materiasExtra: [] })));

        await new CrearCuaderno(p).ejecutar({ usuarioId, nombre: 'Redes', idMateria: redes, idCuatrimestre: c2025.idCuatrimestre, materiasExtra: [] });

        await caso(13, 'Recursar una materia libre', 'cursando | 2 cursadas: 2C 2026, 2C 2025 | horario copiado', async () => {
            const { idCuaderno } = await new RecursarMateria(p).ejecutar({ usuarioId, idMateria: redes, idCuatrimestre: c2026.idCuatrimestre, copiarHorarios: true });
            const [{ estado }] = await p.ejecutar<{ estado: string }>(`SELECT estado FROM materia WHERE id_materia = $1`, [redes]);
            const cuaderno = await new ObtenerCuaderno(p, listarCuadernos).ejecutar({ usuarioId, idCuaderno });
            const copiado = (await new ListarHorarios(p).ejecutar({ usuarioId, idCuatrimestre: c2026.idCuatrimestre }))
                .some((h) => h.titulo === 'Redes' && h.diaSemana === 1 && h.horaInicio === '18:00');
            return `${estado} | ${cuaderno.cursadas.length} cursadas: ${cuaderno.cursadas.map((c) => c.cuatrimestre).join(', ')} | ${copiado ? 'horario copiado' : 'sin horario'}`;
        });

        await caso(14, 'Los cuadernos se ordenan del cuatrimestre más nuevo al más viejo', '2C 2026, 2C 2026, 2C 2025', async () =>
            (await listarCuadernos.ejecutar({ usuarioId })).map((c) => c.cuatrimestre?.corto).join(', '));

        await caso(15, 'Borrar un cuatrimestre deja sus cuadernos sin cuatrimestre', 'sin cuatrimestre: Redes', async () => {
            await new EliminarCuatrimestre(p).ejecutar({ usuarioId, idCuatrimestre: c2025.idCuatrimestre });
            const sueltos = (await listarCuadernos.ejecutar({ usuarioId })).filter((c) => !c.cuatrimestre);
            return `sin cuatrimestre: ${sueltos.map((c) => c.nombre).join(', ')}`;
        });
    } finally {
        await p.ejecutar(`DELETE FROM usuarios WHERE id_usuario = $1`, [usuarioId]);
        await pool.end();
    }

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
