import { pool } from '../../persistencia/baseDeDatos';
import { Persistencia } from '../../persistencia/persistencia';
import { AplicarCambiosDeGoogle } from '../../logicaPersistente/gestionDeCalendarioGoogle/aplicarCambiosDeGoogle';

// Tests de traer a Syntra lo que se cambió en Google Calendar. Usan la base de datos:
// crean un usuario de prueba y lo borran al terminar.
// Se corren con: npx tsx src/main/tests/calendarioGoogle/testCambiosDeGoogle.ts

const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};

const hhmm = (f: Date) => `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;

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
    const aplicar = new AplicarCambiosDeGoogle(p);
    // Una semana para adelante, así las sesiones no quedan atrasadas.
    const base = new Date();
    base.setDate(base.getDate() + 7);
    const a = (hora: number, minutos = 0) => new Date(base.getFullYear(), base.getMonth(), base.getDate(), hora, minutos);

    const [{ id_usuario: usuarioId }] = await p.ejecutar<{ id_usuario: number }>(
        `INSERT INTO usuarios (nombre, apellido, apodo, email, password_hash, email_verificado)
         VALUES ('Prueba', 'Google', 'Prueba', 'google' || floor(random() * 1e9) || '@syntra.test', 'x', TRUE) RETURNING id_usuario`);
    const [{ id_formacion }] = await p.ejecutar<{ id_formacion: number }>(
        `INSERT INTO formacion (id_usuario, tipo, nombre) VALUES ($1, 'grado', 'Ing. en sistemas') RETURNING id_formacion`, [usuarioId]);
    const [{ id_materia }] = await p.ejecutar<{ id_materia: number }>(
        `INSERT INTO materia (id_formacion, nombre, estado) VALUES ($1, 'Probabilidad', 'cursando') RETURNING id_materia`, [id_formacion]);
    const evento = async (titulo: string, fecha: Date) => (await p.ejecutar<{ id: number }>(
        `INSERT INTO eventos (usuario_id, titulo, fecha, lugar, categoria) VALUES ($1, $2, $3, 'Aula 5', 'Parciales') RETURNING id`,
        [usuarioId, titulo, fecha]))[0].id;
    const sesion = async (nombre: string, fecha: Date, duracion: number, estado = 'sin_empezar') => (await p.ejecutar<{ id: number }>(
        `INSERT INTO sesion_estudio (id_usuario, id_materia, nombre, duracion, fecha_programada, estado, fecha_inicio)
         VALUES ($1, $2, $3, $4, $5, $6::varchar, CASE WHEN $6::varchar = 'en_curso' THEN now() END) RETURNING id_sesion_estudio AS id`,
        [usuarioId, id_materia, nombre, duracion, fecha, estado]))[0].id;

    try {
        await caso(1, 'Un evento movido en Google cambia de hora, título y lugar en Syntra', '16:00 | Parcial de Probabilidad (recu) | Aula 9 | 1 traído', async () => {
            const id = await evento('Parcial de Probabilidad', a(14));
            const traidos = await aplicar.ejecutar(usuarioId, [
                { clave: `ev${id}`, titulo: 'Parcial de Probabilidad (recu)', inicio: a(16), fin: a(17), lugar: 'Aula 9' },
            ]);
            const [fila] = await p.ejecutar(`SELECT titulo, fecha, lugar FROM eventos WHERE id = $1`, [id]);
            return `${hhmm(new Date(fila.fecha))} | ${fila.titulo} | ${fila.lugar} | ${traidos.length} traído`;
        });

        await caso(2, 'El aviso guarda a qué hora estaba antes', 'antes 14:00, ahora 16:00', async () => {
            const id = await evento('Entrega TP', a(14));
            const [t] = await aplicar.ejecutar(usuarioId, [{ clave: `ev${id}`, titulo: 'Entrega TP', inicio: a(16), fin: a(17), lugar: null }]);
            return `antes ${hhmm(new Date(t.antes))}, ahora ${hhmm(new Date(t.ahora))}`;
        });

        await caso(3, 'Un evento de otro usuario no se toca', '0 traídos | 14:00', async () => {
            const id = await evento('Parcial ajeno', a(14));
            const traidos = await aplicar.ejecutar(usuarioId + 100000, [{ clave: `ev${id}`, titulo: 'X', inicio: a(18), fin: a(19), lugar: null }]);
            const [fila] = await p.ejecutar(`SELECT fecha FROM eventos WHERE id = $1`, [id]);
            return `${traidos.length} traídos | ${hhmm(new Date(fila.fecha))}`;
        });

        await caso(4, 'Una sesión movida a un horario libre se reprograma y cambia su duración', '20:00 | 90 min', async () => {
            const id = await sesion('Repaso', a(9), 60);
            await aplicar.ejecutar(usuarioId, [{ clave: `se${id}`, titulo: 'Estudiar Probabilidad: Repaso', inicio: a(20), fin: a(21, 30), lugar: null }]);
            const [fila] = await p.ejecutar(`SELECT fecha_programada, duracion FROM sesion_estudio WHERE id_sesion_estudio = $1`, [id]);
            return `${hhmm(new Date(fila.fecha_programada))} | ${fila.duracion} min`;
        });

        await caso(5, 'Una sesión que se pisaría con otra no se mueve', '0 traídos | 11:00', async () => {
            await sesion('Ejercicios', a(15), 60);
            const id = await sesion('Teoría', a(11), 60);
            const traidos = await aplicar.ejecutar(usuarioId, [{ clave: `se${id}`, titulo: 'Teoría', inicio: a(15, 30), fin: a(16, 30), lugar: null }]);
            const [fila] = await p.ejecutar(`SELECT fecha_programada FROM sesion_estudio WHERE id_sesion_estudio = $1`, [id]);
            return `${traidos.length} traídos | ${hhmm(new Date(fila.fecha_programada))}`;
        });

        await caso(6, 'Una sesión que ya empezó no se reprograma', '0 traídos', async () => {
            const id = await sesion('En curso', a(7), 60, 'en_curso');
            const traidos = await aplicar.ejecutar(usuarioId, [{ clave: `se${id}`, titulo: 'En curso', inicio: a(22), fin: a(23), lugar: null }]);
            return `${traidos.length} traídos`;
        });

        await caso(7, 'Si en Google la sesión dura más de 12 horas, no se trae', '0 traídos', async () => {
            const id = await sesion('Maratón', a(5), 60);
            const fin = new Date(a(5).getTime() + 13 * 60 * 60_000);
            const traidos = await aplicar.ejecutar(usuarioId, [{ clave: `se${id}`, titulo: 'Maratón', inicio: a(5), fin, lugar: null }]);
            return `${traidos.length} traídos`;
        });
    } finally {
        await p.ejecutar(`DELETE FROM usuarios WHERE id_usuario = $1`, [usuarioId]);
        await pool.end();
    }

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
