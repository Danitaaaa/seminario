/**
 * Integración liviana: NO se mockea alcance.ts ni permisos.ts.
 * Se ejercitan exigirAcceso → exigirRol → obtenerRolActivo y registrarCambioSiProyecto → registrarCambio
 * reales; solo la persistencia es falsa y responde según el SQL recibido.
 */
import { CrearMeta } from '../../logicaPersistente/gestionDeMetas/crearMeta';
import { ModificarMeta } from '../../logicaPersistente/gestionDeMetas/modificarMeta';
import { AlternarMeta } from '../../logicaPersistente/gestionDeMetas/alternarMeta';
import { EliminarMeta } from '../../logicaPersistente/gestionDeMetas/eliminarMeta';
import { CopiarMetas } from '../../logicaPersistente/gestionDeMetas/copiarMetas';
import { ListarMetas } from '../../logicaPersistente/gestionDeMetas/listarMetas';
import { EstadisticasMetasProyecto } from '../../logicaPersistente/gestionDeMetas/estadisticasMetas';
import { filaMeta } from './utilsTest';
import { persistenciaPorSql, consultasA, Regla } from './utilsPersistenciaPorSql';

type Rol = 'propietario' | 'editor' | 'lector';

const SIN_PERMISOS = 'No tenés permisos para esta operación';
const NO_MIEMBRO = 'El usuario no es miembro del proyecto';
const AJENA = 'No tenés permiso sobre este elemento personal';

const ESCRITURAS = /UPDATE metas SET|DELETE FROM metas|INSERT INTO metas|cola_sincronizacion|UPDATE proyectos SET/;
const COLA = /INSERT INTO cola_sincronizacion/;

/** `rol` = rol activo del usuario 7 en el proyecto 3 (null = no es miembro / dado de baja). */
function entorno(rol: Rol | null, fila: Record<string, any>, filasEscritura: unknown[] = [fila]) {
    const reglas: Regla[] = [
        { cuando: /FROM proyecto_miembros/, filas: () => (rol ? [{ rol }] : []) },
        { cuando: /DELETE FROM metas/, filas: [{ id_global: 'g-borrada' }] },
        {   // registrarCambioSiProyecto: devuelve el id_global de la meta pedida (parámetro 0 = id de la meta)
            cuando: /SELECT id_global FROM metas/,
            filas: (_sql, params) => {
                const meta: any = [fila, ...filasEscritura].find((f: any) => f.id_meta === params[0]);
                return [{ id_global: meta?.id_global ?? fila.id_global }];
            },
        },
        { cuando: /FROM metas WHERE id_meta = \$1/, filas: [fila] },        // obtenerFilaMeta
        { cuando: /UPDATE metas SET|INSERT INTO metas/, filas: filasEscritura },
        { cuando: /ORDER BY orden, id_meta/, filas: [fila] },              // ListarMetas
    ];
    return persistenciaPorSql(reglas);
}

const filaProyecto = (o: Record<string, any> = {}) => filaMeta({ id_proyecto: 3, creada_por: 12, ...o });

function cambiosEnCola(ejecutar: jest.Mock) {
    return consultasA(ejecutar, COLA).map(([, v]) => {
        const [idProyecto, entidad, idEntidad, operacion, payload] = v as any[];
        return { idProyecto, entidad, idEntidad, operacion, payload: payload ? JSON.parse(payload) : null };
    });
}

describe('Metas de proyecto con permisos reales', () => {
    describe('el lector no puede escribir', () => {
        const escrituras: [string, (p: any) => Promise<unknown>][] = [
            ['crear', p => new CrearMeta(p).ejecutar({ idUsuario: 7, idProyecto: 3, titulo: 'T', mes: '2026-10' })],
            ['modificar', p => new ModificarMeta(p).ejecutar({ idMeta: 1, idUsuario: 7, titulo: 'X' })],
            ['reordenar', p => new ModificarMeta(p).ejecutar({ idMeta: 1, idUsuario: 7, orden: 4 })],
            ['marcar como cumplida', p => new AlternarMeta(p).ejecutar({ idMeta: 1, idUsuario: 7, completada: true })],
            ['desmarcar', p => new AlternarMeta(p).ejecutar({ idMeta: 1, idUsuario: 7, completada: false })],
            ['alternar', p => new AlternarMeta(p).ejecutar({ idMeta: 1, idUsuario: 7 })],
            ['eliminar', p => new EliminarMeta(p).ejecutar({ idMeta: 1, idUsuario: 7 })],
            ['copiar al mes siguiente', p => new CopiarMetas(p).ejecutar({
                idUsuario: 7, idProyecto: 3, mesOrigen: '2026-09', mesDestino: '2026-10', soloPendientes: true })],
        ];

        it.each(escrituras)('%s: rechaza y no escribe nada ni registra cambios', async (_n, operar) => {
            const { persistencia, ejecutar, transaccion } = entorno('lector', filaProyecto());
            await expect(operar(persistencia)).rejects.toThrow(SIN_PERMISOS);
            expect(transaccion).not.toHaveBeenCalled();
            expect(consultasA(ejecutar, ESCRITURAS)).toHaveLength(0);
        });

        it('consulta el rol del usuario correcto en el proyecto correcto', async () => {
            const { persistencia, ejecutar } = entorno('lector', filaProyecto());
            await expect(new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 })).rejects.toThrow();
            const [consulta] = consultasA(ejecutar, /FROM proyecto_miembros/);
            expect(consulta[0]).toContain('fecha_baja IS NULL');
            expect(consulta[1]).toEqual([3, 7]);
        });
    });

    describe('el lector sí puede consultar', () => {
        it('listar metas', async () => {
            const { persistencia } = entorno('lector', filaProyecto());
            const metas = await new ListarMetas(persistencia).ejecutar({ idUsuario: 7, idProyecto: 3, mes: '2026-10' });
            expect(metas).toHaveLength(1);
        });

        it('ver estadísticas', async () => {
            const { persistencia } = entorno('lector', filaProyecto());
            await expect(new EstadisticasMetasProyecto(persistencia).ejecutar({ idUsuario: 7, idProyecto: 3 }))
                .resolves.toEqual({ porMes: [], porMiembro: [] });
        });
    });

    describe.each<Rol>(['propietario', 'editor'])('%s puede escribir y se registra para sincronizar', rol => {
        it('crear: registra "crear" con idGlobal en el payload', async () => {
            const fila = filaProyecto({ id_meta: 11, titulo: 'Nueva', mes_texto: '2026-10', id_global: 'g-11' });
            const { persistencia, ejecutar } = entorno(rol, fila);
            await new CrearMeta(persistencia).ejecutar({ idUsuario: 7, idProyecto: 3, titulo: 'Nueva', mes: '2026-10' });
            expect(cambiosEnCola(ejecutar)).toEqual([{
                idProyecto: 3, entidad: 'meta', idEntidad: 11, operacion: 'crear',
                payload: { titulo: 'Nueva', mes: '2026-10', idGlobal: 'g-11' },
            }]);
        });

        it('modificar / reordenar: registra "modificar" con idGlobal', async () => {
            const fila = filaProyecto({ titulo: 'Final', orden: 6 });
            const { persistencia, ejecutar } = entorno(rol, fila);
            await new ModificarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, orden: 6 });
            expect(cambiosEnCola(ejecutar)).toEqual([{
                idProyecto: 3, entidad: 'meta', idEntidad: 1, operacion: 'modificar',
                payload: { titulo: 'Final', orden: 6, idGlobal: 'global-1' },
            }]);
        });

        it('marcar como cumplida: registra "modificar" con completada=true', async () => {
            const { persistencia, ejecutar } = entorno(rol, filaProyecto(), [filaProyecto({ completada: true })]);
            const meta = await new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, completada: true });
            expect(meta.completada).toBe(true);
            expect(cambiosEnCola(ejecutar)).toEqual([{
                idProyecto: 3, entidad: 'meta', idEntidad: 1, operacion: 'modificar',
                payload: { completada: true, idGlobal: 'global-1' },
            }]);
        });

        it('desmarcar: registra completada=false', async () => {
            const { persistencia, ejecutar } = entorno(rol, filaProyecto({ completada: true }), [filaProyecto({ completada: false })]);
            await new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, completada: false });
            expect(cambiosEnCola(ejecutar)[0].payload).toMatchObject({ completada: false });
        });

        it('eliminar: registra "eliminar" con el idGlobal del RETURNING (la fila ya no existe)', async () => {
            const { persistencia, ejecutar } = entorno(rol, filaProyecto({ titulo: 'Borrar' }));
            await new EliminarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 });
            expect(cambiosEnCola(ejecutar)).toEqual([{
                idProyecto: 3, entidad: 'meta', idEntidad: 1, operacion: 'eliminar',
                payload: { titulo: 'Borrar', idGlobal: 'g-borrada' },
            }]);
            expect(consultasA(ejecutar, /SELECT id_global FROM metas/)).toHaveLength(0);
        });

        it('copiar: registra un "crear" por cada meta copiada', async () => {
            const copiadas = [
                filaProyecto({ id_meta: 20, titulo: 'A', id_global: 'g-20' }),
                filaProyecto({ id_meta: 21, titulo: 'B', id_global: 'g-21' }),
            ];
            const { persistencia, ejecutar } = entorno(rol, filaProyecto(), copiadas);
            await new CopiarMetas(persistencia).ejecutar({
                idUsuario: 7, idProyecto: 3, mesOrigen: '2026-09', mesDestino: '2026-10', soloPendientes: true });
            expect(cambiosEnCola(ejecutar).map(c => [c.idEntidad, c.operacion, c.payload.idGlobal]))
                .toEqual([[20, 'crear', 'g-20'], [21, 'crear', 'g-21']]);
        });

        it('cada escritura sube la versión del proyecto exactamente una vez por cambio', async () => {
            const { persistencia, ejecutar } = entorno(rol, filaProyecto(), [filaProyecto({ completada: true })]);
            await new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 });
            const subidas = consultasA(ejecutar, /UPDATE proyectos SET version = version \+ 1/);
            expect(subidas).toHaveLength(1);
            expect(subidas[0][1]).toEqual([3]);
        });
    });

    describe('usuario que no es miembro activo (o fue quitado)', () => {
        it('no puede leer ni escribir', async () => {
            const a = entorno(null, filaProyecto());
            await expect(new ListarMetas(a.persistencia).ejecutar({ idUsuario: 7, idProyecto: 3, mes: '2026-10' }))
                .rejects.toThrow(NO_MIEMBRO);
            const b = entorno(null, filaProyecto());
            await expect(new AlternarMeta(b.persistencia).ejecutar({ idMeta: 1, idUsuario: 7 })).rejects.toThrow(NO_MIEMBRO);
            expect(consultasA(b.ejecutar, ESCRITURAS)).toHaveLength(0);
        });
    });
});

describe('Metas personales con permisos reales', () => {
    it('el creador opera sin consultar membresías y no se encola nada para sincronizar', async () => {
        const fila = filaMeta({ id_proyecto: null, creada_por: 7 });
        const { persistencia, ejecutar } = entorno(null, fila, [filaMeta({ completada: true })]);
        const meta = await new AlternarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 });
        expect(meta.completada).toBe(true);
        expect(consultasA(ejecutar, /proyecto_miembros/)).toHaveLength(0);
        expect(consultasA(ejecutar, COLA)).toHaveLength(0);
        expect(consultasA(ejecutar, /UPDATE proyectos SET/)).toHaveLength(0);
        expect(consultasA(ejecutar, /SELECT id_global/)).toHaveLength(0);
    });

    it('otro usuario no puede marcar, modificar ni eliminar una meta personal ajena', async () => {
        const ajena = filaMeta({ id_proyecto: null, creada_por: 12 });
        for (const operar of [
            (p: any) => new AlternarMeta(p).ejecutar({ idMeta: 1, idUsuario: 7 }),
            (p: any) => new ModificarMeta(p).ejecutar({ idMeta: 1, idUsuario: 7, titulo: 'X' }),
            (p: any) => new EliminarMeta(p).ejecutar({ idMeta: 1, idUsuario: 7 }),
        ]) {
            const { persistencia, ejecutar } = entorno('propietario', ajena);
            await expect(operar(persistencia)).rejects.toThrow(AJENA);
            expect(consultasA(ejecutar, ESCRITURAS)).toHaveLength(0);
        }
    });

    it('crear una meta personal no encola cambios', async () => {
        const { persistencia, ejecutar } = entorno(null, filaMeta());
        await new CrearMeta(persistencia).ejecutar({ idUsuario: 7, titulo: 'T', mes: '2026-10' });
        expect(consultasA(ejecutar, COLA)).toHaveLength(0);
    });
});