import { beforeEach, describe, expect, it } from 'vitest';
import { BDFalsa } from './fakes';
import { exigirRol, obtenerRolActivo, registrarCambio } from '../../logicaPersistente/gestionDeProyectos/permisos';

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

describe('exigirRol', () => {
    it('devuelve el rol si está permitido', async () => {
        await expect(exigirRol(bd, 1, 10, ['editor', 'propietario'])).resolves.toBe('editor');
    });
    it('rechaza a quien no es miembro', async () => {
        await expect(exigirRol(bd, 1, 99, ['editor'])).rejects.toThrow('no es miembro');
    });
    it('rechaza a un miembro con rol insuficiente', async () => {
        await expect(exigirRol(bd, 1, 10, ['propietario'])).rejects.toThrow('No tenés permisos');
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
