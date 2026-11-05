import { beforeEach, describe, expect, it } from 'vitest';
import { BDFalsa, UUID, crearSyncFalso, type SyncFalso } from './fakes';
import { ClaveEdicion } from '../../logicaPersistente/gestionDeProyectos/claveEdicion';
import { EdicionCompartida } from '../../logicaPersistente/gestionDeProyectos/edicionCompartida';
import { aplicarMiembrosRemotos } from '../../logicaPersistente/gestionDeProyectos/miembrosRemotos';
import { SincronizarProyecto } from '../../logicaPersistente/gestionDeProyectos/sincronizarProyecto';

// Lo que necesita la pantalla para bloquear la edición y mostrar los conflictos
// (tabla "Manejo de edición asíncrona" y tests 57, 64 y 72), y los roles cambiados desde otra compu (tests 26 y 28).

describe('ClaveEdicion: proyecto e id global del elemento que se abre', () => {
    let bd: BDFalsa;
    beforeEach(() => { bd = new BDFalsa(); });

    it('archivo dentro de la carpeta de un proyecto: devuelve el proyecto y su id global', async () => {
        bd.sobre(/^SELECT id_global::text AS id_global, id_padre FROM archivos/, [{ id_global: UUID, id_padre: 40 }]);
        bd.sobre(/WITH RECURSIVE ancestros/, [{ id_proyecto: 3 }]);
        await expect(new ClaveEdicion(bd).ejecutar({ entidad: 'archivo', id: 7 })).resolves.toEqual({ idProyecto: 3, idGlobal: UUID });
    });

    it('archivo del material personal: null (no hay bloqueos)', async () => {
        bd.sobre(/^SELECT id_global::text AS id_global, id_padre FROM archivos/, [{ id_global: UUID, id_padre: 1 }]);
        await expect(new ClaveEdicion(bd).ejecutar({ entidad: 'archivo', id: 7 })).resolves.toBeNull();
    });

    it('evento y meta de proyecto: usan su id_proyecto', async () => {
        bd.sobre(/FROM eventos WHERE id = \$1/, [{ id_global: UUID, id_proyecto: 3 }]);
        bd.sobre(/FROM metas WHERE id_meta = \$1/, [{ id_global: UUID, id_proyecto: null }]);
        await expect(new ClaveEdicion(bd).ejecutar({ entidad: 'evento', id: 2 })).resolves.toEqual({ idProyecto: 3, idGlobal: UUID });
        await expect(new ClaveEdicion(bd).ejecutar({ entidad: 'meta', id: 2 })).resolves.toBeNull();
    });

    it('elemento inexistente o entidad no válida: error', async () => {
        await expect(new ClaveEdicion(bd).ejecutar({ entidad: 'archivo', id: 99 })).rejects.toThrow(/No existe un archivo/);
        await expect(new ClaveEdicion(bd).ejecutar({ entidad: 'tarea', id: 1 })).rejects.toThrow();
    });
});

describe('listarConflictos: incluye el nombre del elemento para mostrarlo en pantalla', () => {
    it('devuelve entidad, id global y nombre', async () => {
        const bd = new BDFalsa().fijarRol(3, 5, 'lector');
        bd.sobre(/FROM estado_entidad_remota e WHERE e.id_proyecto = \$1 AND e.conflicto_remoto IS NOT NULL/,
            [{ entidad: 'archivo', id_global: UUID, nombre: 'resumen.docx' }, { entidad: 'meta', id_global: UUID, nombre: null }]);
        const edicion = new EdicionCompartida(bd, crearSyncFalso() as any, {});
        await expect(edicion.listarConflictos({ idProyecto: 3, idUsuario: 5 })).resolves.toEqual([
            { entidad: 'archivo', idGlobal: UUID, nombre: 'resumen.docx' },
            { entidad: 'meta', idGlobal: UUID, nombre: null },
        ]);
    });

    it('quien no es miembro no los puede ver', async () => {
        const edicion = new EdicionCompartida(new BDFalsa(), crearSyncFalso() as any, {});
        await expect(edicion.listarConflictos({ idProyecto: 3, idUsuario: 5 })).rejects.toThrow('no es miembro');
    });
});

describe('aplicarMiembrosRemotos: avisa si cambió algo', () => {
    const remoto = (o: Record<string, unknown>) => ({ idGlobal: null, pendiente: false, fechaUnion: null, fechaBaja: null, activo: true, ...o }) as any;

    it('un cambio de rol actualiza la fila y devuelve true', async () => {
        let filas = [{ id_proyecto_miembro: 1, rol: 'lector', fecha_baja: null }];
        const bd = new BDFalsa()
            .sobre(/^SELECT id_proyecto_miembro, rol, fecha_baja FROM proyecto_miembros/, () => filas)
            .sobre(/id_global_usuario = id_global_de_mail/, [{ id_proyecto_miembro: 1, fecha_baja: null }])
            .sobre(/^UPDATE proyecto_miembros SET rol = \$2/, (v) => { filas = [{ ...filas[0], rol: v[1] as string }]; return []; });
        await expect(aplicarMiembrosRemotos(bd, 3, [remoto({ mail: 'caro@x.com', rol: 'editor' })])).resolves.toBe(true);
        expect(bd.que(/^UPDATE proyecto_miembros SET rol = \$2/)[0].valores).toEqual([1, 'editor', 'caro@x.com']);
    });

    it('sin cambios devuelve false', async () => {
        const bd = new BDFalsa()
            .sobre(/^SELECT id_proyecto_miembro, rol, fecha_baja FROM proyecto_miembros/, [{ id_proyecto_miembro: 1, rol: 'editor', fecha_baja: null }])
            .sobre(/id_global_usuario = id_global_de_mail/, [{ id_proyecto_miembro: 1, fecha_baja: null }]);
        await expect(aplicarMiembrosRemotos(bd, 3, [remoto({ mail: 'caro@x.com', rol: 'editor' })])).resolves.toBe(false);
    });

    it('un miembro pendiente (no aceptó la invitación) no se agrega', async () => {
        const bd = new BDFalsa();
        await aplicarMiembrosRemotos(bd, 3, [remoto({ mail: 'nuevo@x.com', rol: 'editor', pendiente: true })]);
        expect(bd.que(/^INSERT INTO proyecto_miembros/)).toHaveLength(0);
    });

    it('un miembro inactivo en el servidor queda dado de baja localmente', async () => {
        const bd = new BDFalsa().sobre(/id_global_usuario = id_global_de_mail/, [{ id_proyecto_miembro: 1, fecha_baja: null }]);
        await aplicarMiembrosRemotos(bd, 3, [remoto({ mail: 'caro@x.com', rol: 'editor', activo: false })]);
        expect(bd.que(/^UPDATE proyecto_miembros SET fecha_baja/)).toHaveLength(1);
    });
});

describe('SincronizarProyecto: trae los roles del servidor (cambiados desde otra compu)', () => {
    let bd: BDFalsa;
    let sync: SyncFalso;
    const edicion = {
        aplicarCambioRemoto: async () => undefined,
        marcarPendiente: async () => undefined,
        subirPendientes: async () => ({ subidas: 0, bloqueadas: 0, conflictos: 0, fallidas: 0 }),
    };

    beforeEach(() => {
        sync = crearSyncFalso();
        let rol = 'lector';
        bd = new BDFalsa().publicar(1, 'R1')
            .sobre(/^SELECT id_remoto, nombre, version_servidor FROM proyectos/, [{ id_remoto: 'R1', nombre: 'P', version_servidor: 0 }])
            .sobre(/^SELECT rol FROM proyecto_miembros/, () => [{ rol }])
            .sobre(/^SELECT id_proyecto_miembro, rol, fecha_baja FROM proyecto_miembros/, () => [{ id_proyecto_miembro: 1, rol, fecha_baja: null }])
            .sobre(/id_global_usuario = id_global_de_mail/, [{ id_proyecto_miembro: 1, fecha_baja: null }])
            .sobre(/^UPDATE proyecto_miembros SET rol = \$2/, (v) => { rol = v[1] as string; return []; });
        sync.listarMiembrosRemotos.mockResolvedValue([
            { mail: 'yo@x.com', rol: 'editor', activo: true, pendiente: false, idGlobal: null, fechaUnion: null, fechaBaja: null },
        ]);
    });

    it('aplica el rol nuevo antes de mirar los permisos y lo cuenta como cambio recibido', async () => {
        const r = await new SincronizarProyecto(bd, sync as any, edicion).ejecutar({ idProyecto: 1, idUsuario: 10 });
        expect(sync.listarMiembrosRemotos).toHaveBeenCalledWith('R1');
        expect(r.recibidos).toBe(1);
        // Ya como editor, envía los cambios pendientes (un lector solo recibe).
        expect(bd.que(/^SELECT \* FROM cola_sincronizacion/)).toHaveLength(1);
    });

    it('no vuelve a pedir los miembros en cada sincronización (cada 15 segundos)', async () => {
        const s = new SincronizarProyecto(bd, sync as any, edicion);
        await s.ejecutar({ idProyecto: 1, idUsuario: 10 });
        await s.ejecutar({ idProyecto: 1, idUsuario: 10 });
        expect(sync.listarMiembrosRemotos).toHaveBeenCalledTimes(1);
    });

    it('si el servidor devuelve la lista vacía no da de baja a nadie', async () => {
        sync.listarMiembrosRemotos.mockResolvedValue([]);
        await new SincronizarProyecto(bd, sync as any, edicion).ejecutar({ idProyecto: 1, idUsuario: 10 });
        expect(bd.que(/^UPDATE proyecto_miembros/)).toHaveLength(0);
    });

    it('si falla pedir los miembros, la sincronización sigue igual', async () => {
        sync.listarMiembrosRemotos.mockRejectedValue(new Error('caído'));
        await expect(new SincronizarProyecto(bd, sync as any, edicion).ejecutar({ idProyecto: 1, idUsuario: 10 }))
            .resolves.toMatchObject({ recibidos: 0 });
    });
});
