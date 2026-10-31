import { describe, expect, it } from 'vitest';
import { materializarCambio, materializarMiembro, materializarProyecto } from '../../logicaPersistente/gestionDeProyectos/materializador';

describe('materializarProyecto', () => {
    it('mapea columnas a propiedades', () => {
        const f = new Date('2030-01-01');
        const p = materializarProyecto({
            id_proyecto: 1, nombre: 'P', fecha_creacion: f, fecha_fin: f, enlace: 'e', id_nodo_raiz: 7,
            id_remoto: 'R', version: 3, version_servidor: 2, ultima_sincronizacion: f,
        });
        expect(p).toEqual({
            idProyecto: 1, nombre: 'P', fechaCreacion: f, fechaFin: f, enlace: 'e', idNodoRaiz: 7,
            idRemoto: 'R', version: 3, versionServidor: 2, ultimaSincronizacion: f,
        });
    });
    it('los campos opcionales ausentes quedan en null', () => {
        const p = materializarProyecto({ id_proyecto: 1, nombre: 'P', fecha_creacion: new Date(), id_nodo_raiz: 1, version: 0, version_servidor: 0 });
        expect(p.fechaFin).toBeNull();
        expect(p.enlace).toBeNull();
        expect(p.idRemoto).toBeNull();
        expect(p.ultimaSincronizacion).toBeNull();
    });
});

describe('materializarMiembro', () => {
    it('normaliza el mail y deriva activo de fecha_baja', () => {
        const m = materializarMiembro({ id_proyecto_miembro: 1, id_usuario: 2, nombre_usuario: 'Ana', email: 'ANA@X.COM', rol: 'editor', fecha_baja: null });
        expect(m).toMatchObject({ mail: 'ana@x.com', activo: true, pendiente: false, fechaBaja: null, fechaUnion: null });
    });
    it('con fecha_baja queda inactivo', () => {
        const baja = new Date();
        const m = materializarMiembro({ nombre_usuario: 'Ana', email: 'a@x.com', rol: 'lector', fecha_baja: baja });
        expect(m.activo).toBe(false);
        expect(m.fechaBaja).toBe(baja);
        expect(m.idUsuario).toBeNull();
    });
});

describe('materializarCambio', () => {
    it('convierte el BIGSERIAL (string) a número', () => {
        const c = materializarCambio({
            id_cambio: '42', id_proyecto: 1, entidad: 'nodo', id_entidad: 5, operacion: 'crear',
            payload: { a: 1 }, fecha_cambio: new Date(), fecha_envio: undefined,
        });
        expect(c.id).toBe(42);
        expect(c.fechaEnvio).toBeNull();
        expect(c.payload).toEqual({ a: 1 });
    });
});
