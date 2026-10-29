import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    aResultado, conReintentos, ErrorArchivoGrande, ErrorBloqueoOcupado, ErrorBloqueoPerdido, ErrorPermiso,
    ErrorServidorNoDisponible, ErrorSesionExpirada, ErrorSinConexion, ErrorSincronizacion,
    ErrorVersionDesactualizada, traducirErrorSupabase,
} from '../../logicaPersistente/gestionDeProyectos/erroresSincronizacion';

describe('clases de error', () => {
    it('conservan nombre de clase, código y detalle', () => {
        const e = new ErrorBloqueoOcupado('Ana', null);
        expect(e).toBeInstanceOf(ErrorSincronizacion);
        expect(e.name).toBe('ErrorBloqueoOcupado');
        expect(e.codigo).toBe('BLOQUEO_OCUPADO');
        expect(e.message).toContain('Ana');
        expect(e.detalle).toEqual({ nombre: 'Ana', desde: null });
    });
    it('ErrorVersionDesactualizada expone versionServidor', () => {
        const e = new ErrorVersionDesactualizada(9);
        expect(e.versionServidor).toBe(9);
        expect(e.detalle).toEqual({ versionServidor: 9 });
    });
    it('ErrorArchivoGrande informa el máximo en MB cuando se conoce', () => {
        expect(new ErrorArchivoGrande(5 * 1048576).message).toContain('5 MB');
        expect(new ErrorArchivoGrande().message).not.toMatch(/\d+ MB/);
    });
});

describe('traducirErrorSupabase', () => {
    const t = (e: unknown) => traducirErrorSupabase(e);

    it('devuelve la misma instancia si ya es un ErrorSincronizacion', () => {
        const e = new ErrorPermiso();
        expect(t(e)).toBe(e);
    });
    it('BLOQUEO_PERDIDO', () => {
        expect(t({ message: 'BLOQUEO_PERDIDO: venció' })).toBeInstanceOf(ErrorBloqueoPerdido);
    });
    it('VERSION_DESACTUALIZADA extrae la versión', () => {
        const e = t({ message: 'VERSION_DESACTUALIZADA:12' }) as ErrorVersionDesactualizada;
        expect(e).toBeInstanceOf(ErrorVersionDesactualizada);
        expect(e.versionServidor).toBe(12);
    });
    it.each([
        ['ENTIDAD_ELIMINADA', 'ENTIDAD_ELIMINADA'],
        ['INVITACION_INVALIDA', 'INVITACION_INVALIDA'],
        ['NO_INVITADO', 'NO_INVITADO'],
    ])('mensaje %s -> código %s', (message, codigo) => {
        expect(t({ message }).codigo).toBe(codigo);
    });
    it.each([
        [{ message: 'SIN_PERMISO' }],
        [{ message: 'x', status: 403 }],
        [{ message: 'new row violates row-level security policy' }],
    ])('permisos: %j', (e) => {
        expect(t(e)).toBeInstanceOf(ErrorPermiso);
    });
    it('AuthRetryableFetchError se trata como falta de conexión', () => {
        expect(t({ name: 'AuthRetryableFetchError', message: 'x' })).toBeInstanceOf(ErrorSinConexion);
    });
    it.each([
        [{ message: 'NO_AUTENTICADO' }],
        [{ message: 'x', status: 401 }],
        [{ message: 'JWT expired' }],
    ])('sesión expirada: %j', (e) => {
        expect(t(e)).toBeInstanceOf(ErrorSesionExpirada);
    });
    it('PGRST116 -> NO_ENCONTRADO', () => {
        expect(t({ code: 'PGRST116', message: 'x' }).codigo).toBe('NO_ENCONTRADO');
    });
    it('413 o "payload too large" -> ARCHIVO_GRANDE', () => {
        expect(t({ status: 413, message: 'x' })).toBeInstanceOf(ErrorArchivoGrande);
        expect(t({ message: 'Payload too large' })).toBeInstanceOf(ErrorArchivoGrande);
    });
    it.each(['fetch failed', 'Failed to fetch', 'getaddrinfo ENOTFOUND x', 'read ECONNRESET', 'network error', 'timeout'])(
        'red: "%s" -> SIN_CONEXION', (message) => {
            expect(t({ message })).toBeInstanceOf(ErrorSinConexion);
        });
    it('5xx -> SERVIDOR_NO_DISPONIBLE', () => {
        expect(t({ status: 503, message: 'boom' })).toBeInstanceOf(ErrorServidorNoDisponible);
    });
    it('lo desconocido queda como DESCONOCIDO con su mensaje', () => {
        const e = t(new Error('algo raro'));
        expect(e.codigo).toBe('DESCONOCIDO');
        expect(e.message).toBe('algo raro');
    });
    it('null / undefined no explotan', () => {
        expect(t(null).codigo).toBe('DESCONOCIDO');
        expect(t(undefined).message).toMatch(/desconocido/i);
    });
});

describe('conReintentos', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('devuelve el resultado sin reintentar si anda a la primera', async () => {
        const fn = vi.fn().mockResolvedValue('ok');
        await expect(conReintentos(fn)).resolves.toBe('ok');
        expect(fn).toHaveBeenCalledTimes(1);
    });
    it('reintenta ante fallas de red y termina bien', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce(new ErrorSinConexion())
            .mockRejectedValueOnce(new ErrorServidorNoDisponible())
            .mockResolvedValue('ok');
        const p = conReintentos(fn);
        await vi.runAllTimersAsync();
        await expect(p).resolves.toBe('ok');
        expect(fn).toHaveBeenCalledTimes(3);
    });
    it('se rinde tras `intentos` y relanza el último error', async () => {
        const fn = vi.fn().mockRejectedValue(new ErrorSinConexion());
        const p = conReintentos(fn, 3);
        const verificacion = expect(p).rejects.toBeInstanceOf(ErrorSinConexion);
        await vi.runAllTimersAsync();
        await verificacion;
        expect(fn).toHaveBeenCalledTimes(3);
    });
    it('NO reintenta errores que no son de red', async () => {
        const fn = vi.fn().mockRejectedValue(new ErrorPermiso());
        await expect(conReintentos(fn)).rejects.toBeInstanceOf(ErrorPermiso);
        expect(fn).toHaveBeenCalledTimes(1);
    });
});

describe('aResultado', () => {
    it('envuelve el éxito', async () => {
        expect(await aResultado(async () => 5)).toEqual({ ok: true, datos: 5 });
    });
    it('conserva código y detalle de ErrorSincronizacion', async () => {
        const r = await aResultado(async () => { throw new ErrorVersionDesactualizada(4); });
        expect(r).toMatchObject({ ok: false, codigo: 'VERSION_DESACTUALIZADA', detalle: { versionServidor: 4 } });
    });
    it('errores comunes -> DESCONOCIDO', async () => {
        expect(await aResultado(async () => { throw new Error('x'); })).toEqual({ ok: false, codigo: 'DESCONOCIDO', mensaje: 'x' });
        expect(await aResultado(async () => { throw 'texto'; })).toMatchObject({ codigo: 'DESCONOCIDO', mensaje: 'texto' });
    });
});
