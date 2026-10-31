import { beforeEach, describe, expect, it } from 'vitest';
import { fijarSesionSync, limpiarSesionSync, passwordSesionSync, usuarioSesionSync } from '../../sesionSync';

beforeEach(() => limpiarSesionSync());

describe('sesionSync', () => {
    it('arranca vacía', () => {
        expect(usuarioSesionSync()).toBeNull();
        expect(passwordSesionSync()).toBeNull();
    });
    it('guarda usuario y contraseña', () => {
        fijarSesionSync(1, 'secreto');
        expect(usuarioSesionSync()).toBe(1);
        expect(passwordSesionSync()).toBe('secreto');
    });
    it('el mismo usuario conserva la contraseña si no llega una nueva', () => {
        fijarSesionSync(1, 'secreto');
        fijarSesionSync(1);
        expect(passwordSesionSync()).toBe('secreto');
    });
    it('al cambiar de usuario descarta la contraseña anterior', () => {
        fijarSesionSync(1, 'secreto');
        fijarSesionSync(2);
        expect(usuarioSesionSync()).toBe(2);
        expect(passwordSesionSync()).toBeNull();
    });
    it('limpiar borra todo', () => {
        fijarSesionSync(1, 'x');
        limpiarSesionSync();
        expect(usuarioSesionSync()).toBeNull();
        expect(passwordSesionSync()).toBeNull();
    });
});
