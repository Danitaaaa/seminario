import { app, safeStorage } from 'electron';
import { randomUUID, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EventoSincronizacion, IPersistenciaProyectos } from './interfacesSincronizacion';
import { SincronizadorSupabase, type ProveedorIdentidad } from './sincronizadorSupabase';
import { EdicionCompartida, type RegistroManejadores } from './edicionCompartida';
import { SincronizarProyecto } from './sincronizarProyecto';
import { CoordinadorSincronizacion } from './coordinadorSincronizacion';
import { AgregarMiembro } from './agregarMiembro';
import { QuitarMiembro } from './quitarMiembro';
import { UnirseAProyecto } from './unirseProyecto';

/**
 * ÚNICO lugar donde se elige el servidor. Para usar otro proveedor: escribir otro adaptador que
 * implemente ISincronizador + IBloqueador + IAvisos y cambiar la línea `new SincronizadorSupabase`.
 */
export interface DepsSincronizacion {
    persistencia: IPersistenciaProyectos;
    crearNodo: { ejecutar(dto: { nombre: string; idPadre: number | null }): Promise<{ id: number }> };
    manejadores: RegistroManejadores;         // costura con archivos/notas/eventos/metas/nodos
    identidad: ProveedorIdentidad;
    mailDe: (idUsuario: number) => Promise<string>;
    emitir: (e: EventoSincronizacion) => void; // normalmente: ventana.webContents.send('sincronizacion:evento', e)
    idNodoPadreProyectos: number;              // la "raíz global" bajo la que cuelgan los proyectos (hoy: 2)
    permitirEdicionSinConexion?: boolean;
}

function idClienteLocal(): string {
    const ruta = join(app.getPath('userData'), 'id-cliente-sync.txt');
    if (existsSync(ruta)) return readFileSync(ruta, 'utf8').trim();
    const id = randomUUID();
    writeFileSync(ruta, id);
    return id;
}

export function componerSincronizacion(d: DepsSincronizacion) {
    const sync = new SincronizadorSupabase({
        url: import.meta.env.MAIN_VITE_SUPABASE_URL,          // electron-vite expone solo variables MAIN_VITE_*
        anonKey: import.meta.env.MAIN_VITE_SUPABASE_ANON_KEY,
        idCliente: idClienteLocal(),
    }, d.identidad, d.mailDe);

    const edicion = new EdicionCompartida(d.persistencia, sync, d.manejadores, d.emitir, {
        latidoMs: 10_000,
        permitirEdicionSinConexion: d.permitirEdicionSinConexion ?? false,
    });
    const sincronizarProyecto = new SincronizarProyecto(d.persistencia, sync, edicion);
    const coordinador = new CoordinadorSincronizacion(d.persistencia, sync, sincronizarProyecto, d.emitir);
    const agregarMiembro = new AgregarMiembro(d.persistencia, sync);
    const quitarMiembro = new QuitarMiembro(d.persistencia, sync);
    const unirseAProyecto = new UnirseAProyecto(d.persistencia, sync, d.crearNodo, sincronizarProyecto, d.idNodoPadreProyectos);

    return { sync, edicion, sincronizarProyecto, coordinador, agregarMiembro, quitarMiembro, unirseAProyecto };
}
export type Sincronizacion = ReturnType<typeof componerSincronizacion>;

/**
 * Credenciales de sincronización: mail y nombre salen de la sesión local. La contraseña de la cuenta
 * de Supabase es un secreto aleatorio por usuario que el usuario nunca ve. Se persiste recién cuando
 * el servidor lo aceptó (confirmar), y se guarda cifrada con safeStorage cuando el sistema lo permite.
 */
    export function crearProveedorIdentidad(
        obtenerPerfil: () => Promise<{ mail: string; nombre: string }>,
    ): ProveedorIdentidad {
        const ruta = join(app.getPath('userData'), 'sync-secretos.json');
        const pendientes = new Map<string, string>(); // generados pero todavía no aceptados por el servidor
        const clave = (mail: string) => mail.trim().toLowerCase();

        const leerTodos = (): Record<string, string> => {
            try { return existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : {}; } catch { return {}; }
        };
        const cifrar = (s: string): string => {
            if (safeStorage.isEncryptionAvailable()) return 'enc:' + safeStorage.encryptString(s).toString('base64');
            console.warn('[sync] safeStorage no disponible: el secreto se guarda sin cifrar (archivo con permisos 0600).');
            return 'raw:' + s;
        };
        const descifrar = (v: string): string | null => {
            try {
                if (v.startsWith('enc:')) return safeStorage.decryptString(Buffer.from(v.slice(4), 'base64'));
                if (v.startsWith('raw:')) return v.slice(4);
            } catch { /* ilegible */ }
            return null;
        };

        return {
            async credenciales() {
                const { mail, nombre } = await obtenerPerfil();
                const k = clave(mail);
                const guardado = leerTodos()[k];
                const password: string =
                    (guardado ? descifrar(guardado) : null)
                    ?? pendientes.get(k)
                    ?? randomBytes(32).toString('base64url');
                // Si es nuevo, queda pendiente hasta que el servidor lo acepte.
                if (!guardado || !descifrar(guardado)) pendientes.set(k, password);
                return { mail, nombre, password };
            },
            confirmar(mail: string) {
                const k = clave(mail);
                const secreto = pendientes.get(k);
                if (!secreto) return;
                const todos = leerTodos();
                todos[k] = cifrar(secreto);
                writeFileSync(ruta, JSON.stringify(todos), { mode: 0o600 });
                pendientes.delete(k);
            },
        };
    }