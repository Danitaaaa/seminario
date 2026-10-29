// Verifica la tabla "Manejo de permisos en proyectos compartidos" (sección Reglas) para tareas,
// y los tests 87, 90, 91, 92, 103/104 del módulo, usando alcance.ts y permisos.ts REALES.
//   - Solo lectura: NO crea / modifica / elimina / asigna / reparte. SÍ consulta y SÍ marca como hecha.
//   - Editor y propietario: pueden todo sin restricción.
//   - No miembro (o dado de baja): rechazado en todo.
// Cubre los bugs exploratorios Nº 3, 4 y 9.
import { CrearTarea } from '../../logicaPersistente/gestionDeTareas/crearTarea';
import { ModificarTarea } from '../../logicaPersistente/gestionDeTareas/modificarTarea';
import { EliminarTarea } from '../../logicaPersistente/gestionDeTareas/eliminarTarea';
import { AsignarTarea } from '../../logicaPersistente/gestionDeTareas/asignarTarea';
import { AlternarTarea } from '../../logicaPersistente/gestionDeTareas/alternarTarea';
import { RepartirTareas } from '../../logicaPersistente/gestionDeTareas/repartirTareas';
import { ListarTareas } from '../../logicaPersistente/gestionDeTareas/listarTareas';
import { IPersistenciaProyectos } from '../../logicaPersistente/gestionDeProyectos/interfacesSincronizacion';
import { filaTarea } from './pruebasComunes';
import { persistenciaPorSql, consultasA } from './persistenciaPorSql';

type Rol = 'propietario' | 'editor' | 'lector';
type Operacion = (p: IPersistenciaProyectos) => Promise<unknown>;

const ID_PROYECTO = 10;
const U = 6;                      // usuario que opera
const PERMISOS = /No tenés permisos para esta operación/;
const NO_MIEMBRO = /El usuario no es miembro del proyecto/;
const PERSONAL_AJENO = /No tenés permiso sobre este elemento personal/;

function base(rol: Rol | null, sobrescribirTarea: Record<string, unknown> = {}) {
    const tarea = filaTarea({ id_proyecto: ID_PROYECTO, creada_por: 99, id_asignado: 8, ...sobrescribirTarea });
    return persistenciaPorSql([
        { cuando: /proyecto_miembros/i, filas: rol ? [{ rol, id_usuario: 8 }] : [] },
        { cuando: /MAX\s*\(/i, filas: [{ orden: 1 }] },
        { cuando: /DELETE FROM tareas/i, filas: [{ id_global: 'g-1' }] },
        { cuando: /^\s*(INSERT INTO|UPDATE)\s+tareas/i, filas: [tarea] },
        { cuando: /FROM tareas/i, filas: [tarea] },
    ]);
}

async function intentar(op: Operacion, p: IPersistenciaProyectos): Promise<Error | null> {
    try { await op(p); return null; } catch (e) { return e as Error; }
}

const crear: Operacion = p => new CrearTarea(p).ejecutar({ idUsuario: U, idProyecto: ID_PROYECTO, titulo: 'T' });
const modificar: Operacion = p => new ModificarTarea(p).ejecutar({ idTarea: 1, idUsuario: U, titulo: 'N' });
const eliminar: Operacion = p => new EliminarTarea(p).ejecutar({ idTarea: 1, idUsuario: U });
const asignar: Operacion = p => new AsignarTarea(p).ejecutar({ idTarea: 1, idUsuario: U, idAsignado: 8 });
const repartir: Operacion = p => new RepartirTareas(p).ejecutar({ idProyecto: ID_PROYECTO, idUsuario: U });
const alternar: Operacion = p => new AlternarTarea(p).ejecutar({ idTarea: 1, idUsuario: U });
const listar: Operacion = p => new ListarTareas(p).ejecutar({ idProyecto: ID_PROYECTO, idUsuario: U });

const ESCRITURA: Array<[string, Operacion]> = [
    ['crear', crear], ['modificar', modificar], ['eliminar', eliminar], ['asignar', asignar], ['repartir', repartir],
];
const TODAS: Array<[string, Operacion]> = [...ESCRITURA, ['marcar como hecha', alternar], ['listar', listar]];

describe('Propietario y editor: operan sin restricción', () => {
    describe.each(['propietario', 'editor'] as Rol[])('rol %s', rol => {
        it.each(TODAS)('%s: no es rechazado por permisos', async (_nombre, op) => {
            const { persistencia } = base(rol);
            const err = await intentar(op, persistencia);
            expect(err?.message ?? '').not.toMatch(PERMISOS);
            expect(err?.message ?? '').not.toMatch(NO_MIEMBRO);
        });
    });

    // Bug exploratorio Nº 3: "como editor de proyecto no se puede eliminar tareas".
    it('el editor elimina una tarea creada por otro miembro y se ejecuta el DELETE', async () => {
        const { persistencia, ejecutar } = base('editor', { creada_por: 99 });
        await expect(eliminar(persistencia)).resolves.toBeUndefined();
        expect(consultasA(ejecutar, /DELETE FROM tareas/i)).toHaveLength(1);
    });

    it('el editor elimina una tarea propia', async () => {
        const { persistencia, ejecutar } = base('editor', { creada_por: U });
        await expect(eliminar(persistencia)).resolves.toBeUndefined();
        expect(consultasA(ejecutar, /DELETE FROM tareas/i)).toHaveLength(1);
    });

    // Bug exploratorio Nº 4: "un propietario no le puede asignar una tarea a otro miembro".
    it('el propietario asigna una tarea a otro miembro y se ejecuta el UPDATE', async () => {
        const { persistencia, ejecutar } = base('propietario', { id_asignado: null });
        await expect(asignar(persistencia)).resolves.toBeDefined();
        expect(consultasA(ejecutar, /^\s*UPDATE\s+tareas/i)).toHaveLength(1);
    });

    // Test 90
    it('un editor modifica una tarea creada por el propietario', async () => {
        const { persistencia, ejecutar } = base('editor', { creada_por: 1 });
        await expect(modificar(persistencia)).resolves.toBeDefined();
        expect(consultasA(ejecutar, /^\s*UPDATE\s+tareas/i)).toHaveLength(1);
    });
});

describe('Solo lectura (lector)', () => {
    // Tests 87 y 92 + regla "Solo lectura | Crear/Modificar/Eliminar tarea | No puede ejecutar estas acciones"
    it.each(ESCRITURA)('%s: se rechaza por permisos y no escribe nada en la base', async (_nombre, op) => {
        const { persistencia, ejecutar } = base('lector');
        await expect(op(persistencia)).rejects.toThrow(PERMISOS);
        expect(consultasA(ejecutar, /^\s*(INSERT|UPDATE|DELETE)/i)).toHaveLength(0);
    });

    // Test 92: "propia o de otro miembro". (Ojo: el bug exploratorio Nº 3 dice que el lector puede
    // eliminar/crear tareas propias; contradice la regla y el test 92. Acá se aplica la regla.)
    it('no puede eliminar ni modificar una tarea propia', async () => {
        for (const op of [eliminar, modificar]) {
            const { persistencia, ejecutar } = base('lector', { creada_por: U });
            await expect(op(persistencia)).rejects.toThrow(PERMISOS);
            expect(consultasA(ejecutar, /^\s*(UPDATE|DELETE)/i)).toHaveLength(0);
        }
    });

    it('puede consultar (listar) las tareas del proyecto', async () => {
        const { persistencia } = base('lector');
        await expect(listar(persistencia)).resolves.toHaveLength(1);
    });

    // Test 104 + regla "Solo lectura | Consultar/Marcar tarea como hecha | Puede visualizar y marcarlas como hechas"
    it('puede marcar como hecha una tarea asignada (se ejecuta el UPDATE)', async () => {
        const { persistencia, ejecutar } = base('lector', { id_asignado: 8, completada: false });
        await expect(alternar(persistencia)).resolves.toBeDefined();
        expect(consultasA(ejecutar, /^\s*UPDATE\s+tareas/i)).toHaveLength(1);
    });
});

describe('Quien no es miembro activo (o fue dado de baja)', () => {
    it.each(TODAS)('%s: se rechaza', async (_nombre, op) => {
        const { persistencia, ejecutar } = base(null);
        await expect(op(persistencia)).rejects.toThrow(NO_MIEMBRO);
        expect(consultasA(ejecutar, /^\s*(INSERT|UPDATE|DELETE)/i)).toHaveLength(0);
    });
});

describe('Tareas personales (sin proyecto)', () => {
    it.each([['modificar', modificar], ['eliminar', eliminar], ['marcar como hecha', alternar]] as Array<[string, Operacion]>)(
        '%s: otro usuario no puede operar sobre una tarea personal ajena', async (_nombre, op) => {
            const { persistencia, ejecutar } = base('editor', { id_proyecto: null, creada_por: 99 });
            await expect(op(persistencia)).rejects.toThrow(PERSONAL_AJENO);
            expect(consultasA(ejecutar, /^\s*(UPDATE|DELETE)/i)).toHaveLength(0);
        });

    it.each([['modificar', modificar], ['eliminar', eliminar]] as Array<[string, Operacion]>)(
        '%s: el creador sí puede operar su tarea personal', async (_nombre, op) => {
            const { persistencia } = base(null, { id_proyecto: null, creada_por: U });
            const err = await intentar(op, persistencia);
            expect(err?.message ?? '').not.toMatch(PERSONAL_AJENO);
            expect(err?.message ?? '').not.toMatch(NO_MIEMBRO);
        });
});