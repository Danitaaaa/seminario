import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BDFalsa, UUID } from '../proyectos/fakes';
import { fijarSesionSync, limpiarSesionSync } from '../../sesionSync';
import { CrearNodo } from '../../logicaPersistente/gestionMaterialEstudio/crearNodo';
import { EliminarNodo } from '../../logicaPersistente/gestionMaterialEstudio/eliminarNodo';
import { exigirPermisoArchivos, exigirPermisoNodo, proyectoDeNodo } from '../../logicaPersistente/gestionMaterialEstudio/alcanceContenido';

// Carpetas y archivos dentro de un proyecto compartido (tests 43, 47, 53 y 54, y la tabla de permisos:
// "Solo lectura | Crear/Modificar/Eliminar/Mover nodo y archivo | No puede ejecutar las operaciones").
// Con BDFalsa: la carpeta 40 cuelga del proyecto 3 (raíz 30); la 2 es del material personal.

const RAIZ = 30;
const USUARIO = 5;

function base(rol: 'propietario' | 'editor' | 'lector' | null) {
    const bd = new BDFalsa();
    if (rol) bd.fijarRol(3, USUARIO, rol);
    // proyectoDeNodo (WITH RECURSIVE ... SELECT p.id_proyecto) y proyectoDe (... p.id_nodo_raiz)
    bd.sobre(/WITH RECURSIVE ancestros[\s\S]*SELECT p\.id_proyecto, p\.id_nodo_raiz/,
        (v) => (v[0] === 2 || v[0] === 1 ? [] : [{ id_proyecto: 3, id_nodo_raiz: RAIZ }]));
    bd.sobre(/WITH RECURSIVE ancestros[\s\S]*SELECT p\.id_proyecto FROM/,
        (v) => (v[0] === 2 || v[0] === 1 ? [] : [{ id_proyecto: 3 }]));
    bd.sobre(/^SELECT id_global FROM nodos WHERE id_nodo = \$1/, (v) => [{ id_global: v[0] === RAIZ ? 'g-raiz' : 'g-40' }]);
    bd.sobre(/^INSERT INTO nodos/, (v) => [{
        id_nodo: 50, id_global: UUID, nombre: v[0], id_padre: v[5], tamaño: 0,
        fecha_carga: new Date(), ultima_fecha_acceso: new Date(), ultima_fecha_modificacion: new Date(),
    }]);
    bd.sobre(/^DELETE FROM nodos/, [{ id_nodo: 41, id_global: UUID, id_padre: 40 }]);
    return bd;
}

beforeEach(() => fijarSesionSync(USUARIO));
afterEach(() => limpiarSesionSync());

describe('Permisos sobre carpetas y archivos de un proyecto', () => {
    it('una carpeta del material personal no consulta permisos', async () => {
        const bd = base(null);
        await expect(exigirPermisoNodo(bd, 2, 'carpeta.crear')).resolves.toBeNull();
        expect(bd.que(/proyecto_miembros/)).toHaveLength(0);
    });

    it('proyectoDeNodo encuentra el proyecto subiendo hasta su carpeta raíz', async () => {
        await expect(proyectoDeNodo(base(null), 40)).resolves.toBe(3);
        await expect(proyectoDeNodo(base(null), 2)).resolves.toBeNull();
    });

    it.each(['propietario', 'editor'] as const)('el %s puede crear carpetas en el proyecto', async (rol) => {
        await expect(exigirPermisoNodo(base(rol), 40, 'carpeta.crear')).resolves.toBe(3);
    });

    it.each(['carpeta.crear', 'carpeta.renombrar', 'carpeta.mover', 'carpeta.eliminar'] as const)(
        'el lector no puede hacer "%s"', async (accion) => {
            await expect(exigirPermisoNodo(base('lector'), 40, accion)).rejects.toThrow('No tenés permisos para esta operación');
        });

    it('el lector sí puede ver los archivos del proyecto', async () => {
        const bd = base('lector').sobre(/^SELECT id_padre FROM archivos/, [{ id_padre: 40 }]);
        await expect(exigirPermisoArchivos(bd, [7], 'archivo.ver')).resolves.toBe(3);
    });

    it('quien no es miembro no puede operar', async () => {
        await expect(exigirPermisoNodo(base(null), 40, 'carpeta.crear')).rejects.toThrow('no es miembro');
    });

    it('sin sesión iniciada no se puede operar sobre un proyecto', async () => {
        limpiarSesionSync();
        await expect(exigirPermisoNodo(base('editor'), 40, 'carpeta.crear')).rejects.toThrow('No hay una sesión iniciada');
    });

    it('no se pueden mover archivos de proyectos distintos juntos', async () => {
        const bd = base('editor').sobre(/^SELECT id_padre FROM archivos/, (v) => [{ id_padre: v[0] === 7 ? 40 : 2 }]);
        await expect(exigirPermisoArchivos(bd, [7, 8], 'archivo.mover')).rejects.toThrow('proyectos distintos');
    });
});

describe('Cambios de carpetas que se sincronizan', () => {
    it('43: crear una carpeta en el proyecto la encola con el id global del padre', async () => {
        const bd = base('editor');
        await new CrearNodo(bd as any).ejecutar({ nombre: 'Informe', idPadre: 40 });
        const [cola] = bd.que(/^INSERT INTO cola_sincronizacion/);
        expect(cola.valores.slice(0, 4)).toEqual([3, 'nodo', 50, 'crear']);
        expect(JSON.parse(cola.valores[4] as string)).toEqual({
            idGlobal: UUID, datos: { nombre: 'Informe', padre_global: 'g-40', padre_es_raiz: false },
        });
    });

    it('en la carpeta raíz del proyecto se marca padre_es_raiz (cada compu tiene su propia raíz)', async () => {
        const bd = base('editor');
        await new CrearNodo(bd as any).ejecutar({ nombre: 'Informe', idPadre: RAIZ });
        const payload = JSON.parse(bd.que(/^INSERT INTO cola_sincronizacion/)[0].valores[4] as string);
        expect(payload.datos.padre_es_raiz).toBe(true);
    });

    it('47: el lector no crea la carpeta ni encola nada', async () => {
        const bd = base('lector');
        await expect(new CrearNodo(bd as any).ejecutar({ nombre: 'X', idPadre: 40 })).rejects.toThrow('No tenés permisos');
        expect(bd.que(/^INSERT INTO nodos/)).toHaveLength(0);
        expect(bd.que(/cola_sincronizacion/)).toHaveLength(0);
    });

    it('una carpeta del material personal no se encola', async () => {
        const bd = base(null);
        await new CrearNodo(bd as any).ejecutar({ nombre: 'Mía', idPadre: 2 });
        expect(bd.que(/cola_sincronizacion/)).toHaveLength(0);
    });

    it('53: eliminar una carpeta vacía del proyecto se encola como "eliminar"', async () => {
        const bd = base('editor');
        await new EliminarNodo(bd as any).ejecutar({ id: 41 });
        expect(bd.que(/^INSERT INTO cola_sincronizacion/)[0].valores.slice(0, 4)).toEqual([3, 'nodo', 41, 'eliminar']);
    });

    it('54: una carpeta con contenido no se elimina y se informa', async () => {
        // La base falsa usa la primera regla que coincide: se arma una con el DELETE que falla.
        const conError = new BDFalsa().fijarRol(3, USUARIO, 'editor')
            .sobre(/^DELETE FROM nodos/, () => { throw Object.assign(new Error('fk'), { code: '23503' }); })
            .sobre(/WITH RECURSIVE ancestros/, [{ id_proyecto: 3, id_nodo_raiz: RAIZ }]);
        await expect(new EliminarNodo(conError as any).ejecutar({ id: 40 })).rejects.toThrow('La carpeta tiene archivos o subcarpetas');
        expect(conError.que(/cola_sincronizacion/)).toHaveLength(0);
    });
});
