import { pool } from '../../persistencia/baseDeDatos';
import { Persistencia } from '../../persistencia/persistencia';
import { CrearMaterias } from '../../logicaPersistente/gestionDeMaterias/crearMaterias';
import { GuardarCorrelativas } from '../../logicaPersistente/gestionDeMaterias/guardarCorrelativas';
import { ListarCorrelativas } from '../../logicaPersistente/gestionDeMaterias/listarCorrelativas';
import { crearMateriasSchema } from '../../logicaPersistente/gestionDeMaterias/dto';

// Tests de correlatividades. Usan la base de datos: crean un usuario de prueba y lo borran al terminar.
// Se corren con: npx tsx src/main/tests/materias/testCorrelativas.ts

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
    const guardar = new GuardarCorrelativas(p);
    const listar = new ListarCorrelativas(p);

    const [{ id_usuario: usuarioId }] = await p.ejecutar<{ id_usuario: number }>(
        `INSERT INTO usuarios (nombre, apellido, apodo, email, password_hash, email_verificado)
         VALUES ('Prueba', 'Correlativas', 'Prueba', 'correl' || floor(random() * 1e9) || '@syntra.test', 'x', TRUE) RETURNING id_usuario`);
    const formacion = async (nombre: string) => (await p.ejecutar<{ id_formacion: number }>(
        `INSERT INTO formacion (id_usuario, tipo, nombre) VALUES ($1, 'grado', $2) RETURNING id_formacion`, [usuarioId, nombre]))[0].id_formacion;

    try {
        const sistemas = await formacion('Ingeniería en Sistemas');
        const industrial = await formacion('Ingeniería Industrial');
        const cargar = (idFormacion: number, materias: { nombre: string; correlativas?: string[] }[]) =>
            new CrearMaterias(p).ejecutar(crearMateriasSchema.parse({ usuarioId, idFormacion, materias }));

        const nombres = new Map<number, string>();
        const texto = async (idFormacion: number) => (await listar.ejecutar({ usuarioId, idFormacion }))
            .map((c) => `${nombres.get(c.idMateria)} ← ${nombres.get(c.idRequisito)}`).sort().join(' │ ');

        const ids: Record<string, number> = {};
        await caso(1, 'Cargar el plan con correlativas por nombre (sin importar acentos ni mayúsculas)', 'Análisis II ← Análisis I │ Física II ← Física I', async () => {
            const creadas = await cargar(sistemas, [
                { nombre: 'Análisis I' },
                { nombre: 'Física I' },
                { nombre: 'Análisis II', correlativas: ['analisis i'] },
                { nombre: 'Física II', correlativas: ['FÍSICA I'] },
            ]);
            creadas.forEach((m) => { nombres.set(m.idMateria, m.nombre); ids[m.nombre] = m.idMateria; });
            return texto(sistemas);
        });

        await caso(2, 'Saltear correlativas que no están en el plan', 'Álgebra sin correlativas', async () => {
            const [algebra] = await cargar(sistemas, [{ nombre: 'Álgebra', correlativas: ['Matemática Discreta'] }]);
            nombres.set(algebra.idMateria, algebra.nombre);
            ids[algebra.nombre] = algebra.idMateria;
            const tiene = (await listar.ejecutar({ usuarioId, idFormacion: sistemas })).some((c) => c.idMateria === algebra.idMateria);
            return `Álgebra ${tiene ? 'con' : 'sin'} correlativas`;
        });

        await caso(3, 'Guardar las correlativas de una materia', 'Análisis II ← Análisis I │ Análisis II ← Álgebra │ Física II ← Física I', async () => {
            await guardar.ejecutar({ usuarioId, idMateria: ids['Análisis II'], requisitos: [ids['Análisis I'], ids['Álgebra']] });
            return texto(sistemas);
        });

        await caso(4, 'Guardar reemplaza las correlativas anteriores', 'Análisis II ← Álgebra │ Física II ← Física I', async () => {
            await guardar.ejecutar({ usuarioId, idMateria: ids['Análisis II'], requisitos: [ids['Álgebra']] });
            return texto(sistemas);
        });

        await caso(5, 'Guardar sin correlativas las borra', 'Física II sin correlativas', async () => {
            await guardar.ejecutar({ usuarioId, idMateria: ids['Física II'], requisitos: [] });
            const tiene = (await listar.ejecutar({ usuarioId, idFormacion: sistemas })).some((c) => c.idMateria === ids['Física II']);
            return `Física II ${tiene ? 'con' : 'sin'} correlativas`;
        });

        await caso(6, 'Una materia no puede ser correlativa de sí misma', 'Error: Una materia no puede ser correlativa de sí misma.', async () =>
            errorDe(() => guardar.ejecutar({ usuarioId, idMateria: ids['Álgebra'], requisitos: [ids['Álgebra']] })));

        await caso(7, 'No permitir correlativas que armen un círculo', 'Error: Eso arma un círculo: una de esas materias ya necesita a esta.', async () =>
            errorDe(() => guardar.ejecutar({ usuarioId, idMateria: ids['Álgebra'], requisitos: [ids['Análisis II']] })));

        await caso(8, 'Las correlativas tienen que ser de la misma formación', 'Error: Las correlativas tienen que ser de la misma formación.', async () => {
            const [quimica] = await cargar(industrial, [{ nombre: 'Química General' }]);
            return errorDe(() => guardar.ejecutar({ usuarioId, idMateria: ids['Física II'], requisitos: [quimica.idMateria] }));
        });

        await caso(9, 'No guardar correlativas de una materia de otro usuario', 'Error: La materia no existe.', async () =>
            errorDe(() => guardar.ejecutar({ usuarioId: usuarioId + 1000000, idMateria: ids['Física II'], requisitos: [] })));

        await caso(10, 'Listar las correlativas de otra formación no trae las de esta', '0 correlativas', async () =>
            `${(await listar.ejecutar({ usuarioId, idFormacion: industrial })).length} correlativas`);
    } finally {
        await p.ejecutar(`DELETE FROM usuarios WHERE id_usuario = $1`, [usuarioId]);
        await pool.end();
    }

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
