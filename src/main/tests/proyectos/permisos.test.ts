import { beforeEach, describe, expect, it } from 'vitest';
import { BDFalsa } from './fakes';
import { exigirPermiso, obtenerRolActivo, registrarCambio } from '../../logicaPersistente/gestionDeProyectos/permisos';

let bd: BDFalsa;
beforeEach(() => { bd = new BDFalsa().fijarRol(1, 10, 'editor'); });

describe('obtenerRolActivo', () => {
    it('devuelve el rol del miembro activo', async () => {
        expect(await obtenerRolActivo(bd, 1, 10)).toBe('editor');
    });
    it('devuelve null si no es miembro', async () => {
        expect(await obtenerRolActivo(bd, 1, 99)).toBeNull();
        expect(await obtenerRolActivo(bd, 2, 10)).toBeNull();
    });
    it('filtra por baja (fecha_baja IS NULL) en la consulta', async () => {
        await obtenerRolActivo(bd, 1, 10);
        expect(bd.consultas[0].sql).toContain('fecha_baja IS NULL');
    });
});

describe('exigirPermiso', () => {
    it('devuelve el rol si está permitido', async () => {
        await expect(exigirPermiso(bd, 1, 10, 'tarea.crear')).resolves.toBe('editor');
    });
    it('rechaza a quien no es miembro', async () => {
        await expect(exigirPermiso(bd, 1, 99, 'tarea.crear')).rejects.toThrow('no es miembro');
    });
    it('rechaza a un miembro con rol insuficiente', async () => {
        await expect(exigirPermiso(bd, 1, 10, 'proyecto.eliminar')).rejects.toThrow('No tenés permisos');
    });
    it('rechaza una acción desconocida con un mensaje claro', async () => {
        await expect(exigirPermiso(bd, 1, 10, 'no.existe' as any)).rejects.toThrow('desconocida');
    });
});

describe('registrarCambio', () => {
    it('encola el cambio con el payload serializado y sube la versión del proyecto', async () => {
        await registrarCambio(bd, 1, 'proyecto', 1, 'modificar', { nombre: 'X' });
        const [ins, upd] = bd.consultas;
        expect(ins.sql).toContain('INSERT INTO cola_sincronizacion');
        expect(ins.valores).toEqual([1, 'proyecto', 1, 'modificar', JSON.stringify({ nombre: 'X' })]);
        expect(upd.sql).toContain('UPDATE proyectos SET version = version + 1');
        expect(upd.valores).toEqual([1]);
    });
    it('sin payload guarda NULL', async () => {
        await registrarCambio(bd, 1, 'nodo', 5, 'eliminar');
        expect(bd.consultas[0].valores[4]).toBeNull();
    });
});