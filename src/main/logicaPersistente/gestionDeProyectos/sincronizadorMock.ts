import { ISincronizador, EstadoRemoto, CambiosRemotos } from './interfacesSincronizacion';
import { CambioPendiente } from './entidades';

type MetodoSync = Exclude<keyof ISincronizador, 'estaConectado'>;

interface CambioAlmacenado { version: number; origen: string; cambio: CambioPendiente; }
interface ProyectoRemoto {
    nombre: string;
    enlace: string;
    version: number;
    cambios: CambioAlmacenado[];
    miembros: Map<number, 'alta' | 'baja'>;
}

/**
 * Servidor de sincronización en memoria. Compartí UNA instancia entre varios
 * SincronizadorMock para simular a varios miembros editando el mismo proyecto.
 */
export class ServidorSincronizacionMock {
    readonly proyectos = new Map<string, ProyectoRemoto>();
    readonly archivos = new Map<string, Uint8Array>();
    private contador = 0;

    crearProyecto(nombre: string): { idRemoto: string; enlace: string } {
        const idRemoto = `remoto-${++this.contador}`;
        const enlace = `https://sync.mock/proyectos/${idRemoto}`;
        this.proyectos.set(idRemoto, { nombre, enlace, version: 0, cambios: [], miembros: new Map() });
        return { idRemoto, enlace };
    }

    obtener(idRemoto: string): ProyectoRemoto {
        const p = this.proyectos.get(idRemoto);
        if (!p) throw new Error(`Proyecto remoto inexistente: ${idRemoto}`);
        return p;
    }

    reiniciar(): void { this.proyectos.clear(); this.archivos.clear(); this.contador = 0; }
}

export interface OpcionesSincronizadorMock {
    /** Identifica al cliente; sus propios cambios no se le devuelven en recibirCambios. */
    idCliente: string;
    /** Latencia simulada por operación (ms). Default 0. */
    latenciaMs?: number;
}

/** Implementación de ISincronizador contra un ServidorSincronizacionMock. */
export class SincronizadorMock implements ISincronizador {
    /** Registro de llamadas para verificar en los tests. */
    readonly llamadas: { metodo: MetodoSync; args: unknown[] }[] = [];

    private conectado = false;
    private fallos = new Map<MetodoSync, { error: Error; veces: number }>();

    constructor(
        private readonly servidor: ServidorSincronizacionMock,
        private readonly opciones: OpcionesSincronizadorMock,
    ) {}

    /** Hace que las próximas `veces` llamadas a `metodo` fallen (p. ej. para probar reintentos). */
    inyectarFallo(metodo: MetodoSync, mensaje = 'Fallo simulado de red', veces = 1): void {
        this.fallos.set(metodo, { error: new Error(mensaje), veces });
    }

    /** Simula la caída de la conexión sin pasar por desconectar(). */
    simularCaida(): void { this.conectado = false; }

    estaConectado(): boolean { return this.conectado; }

    async conectar(): Promise<void> { await this.paso('conectar', [], false); this.conectado = true; }
    async desconectar(): Promise<void> { await this.paso('desconectar', [], false); this.conectado = false; }

    async publicarProyecto(idProyectoLocal: number, nombre: string): Promise<EstadoRemoto> {
        await this.paso('publicarProyecto', [idProyectoLocal, nombre]);
        const { idRemoto, enlace } = this.servidor.crearProyecto(nombre);
        return { idRemoto, enlace, version: 0 };
    }

    async resolverEnlace(enlace: string) {
        await this.paso('resolverEnlace', [enlace]);
        const encontrado = [...this.servidor.proyectos.entries()].find(([, p]) => p.enlace === enlace);
        if (!encontrado) throw new Error('Enlace de invitación inválido o expirado');
        const [idRemoto, p] = encontrado;
        return { idRemoto, nombre: p.nombre, numeroProyecto: `MOCK-${idRemoto}` };
    }

    async enviarCambios(idRemoto: string, cambios: CambioPendiente[]): Promise<number> {
        await this.paso('enviarCambios', [idRemoto, cambios]);
        const p = this.servidor.obtener(idRemoto);
        for (const cambio of cambios) {
            p.cambios.push({ version: ++p.version, origen: this.opciones.idCliente, cambio: structuredClone(cambio) });
        }
        return p.version;
    }

    async recibirCambios(idRemoto: string, desdeVersion: number): Promise<CambiosRemotos> {
        await this.paso('recibirCambios', [idRemoto, desdeVersion]);
        const p = this.servidor.obtener(idRemoto);
        const cambios = p.cambios
            .filter(c => c.version > desdeVersion && c.origen !== this.opciones.idCliente)
            .map(c => structuredClone(c.cambio));
        return { cambios, versionServidor: p.version };
    }

    async subirArchivo(idRemoto: string, idArchivo: number, contenido: Uint8Array): Promise<void> {
        await this.paso('subirArchivo', [idRemoto, idArchivo]);
        this.servidor.obtener(idRemoto);
        this.servidor.archivos.set(`${idRemoto}:${idArchivo}`, contenido.slice());
    }

    async descargarArchivo(idRemoto: string, idArchivo: number): Promise<Uint8Array> {
        await this.paso('descargarArchivo', [idRemoto, idArchivo]);
        const c = this.servidor.archivos.get(`${idRemoto}:${idArchivo}`);
        if (!c) throw new Error('Archivo remoto inexistente');
        return c.slice();
    }

    async notificarMiembro(idRemoto: string, idUsuario: number, accion: 'alta' | 'baja'): Promise<void> {
        await this.paso('notificarMiembro', [idRemoto, idUsuario, accion]);
        this.servidor.obtener(idRemoto).miembros.set(idUsuario, accion);
    }

    // Registra la llamada, aplica latencia, valida conexión e inyecta fallos.
    private async paso(metodo: MetodoSync, args: unknown[], requiereConexion = true): Promise<void> {
        this.llamadas.push({ metodo, args });
        if (this.opciones.latenciaMs) await new Promise(r => setTimeout(r, this.opciones.latenciaMs));
        if (requiereConexion && !this.conectado) throw new Error('Sin conexión con el servidor de sincronización');
        const fallo = this.fallos.get(metodo);
        if (fallo && fallo.veces > 0) {
            if (--fallo.veces === 0) this.fallos.delete(metodo);
            throw fallo.error;
        }
    }
}