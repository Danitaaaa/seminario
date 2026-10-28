import type { Sincronizacion } from '../logicaPersistente/gestionDeProyectos/componerSincronizacion';

type UnirseDatos = Parameters<Sincronizacion['unirseAProyecto']['ejecutar']>[0];

/**
 * Fachada de la edición compartida y de la sincronización: el IPC solo habla con esta clase,
 * igual que Metas o Tareas.
 */
export class Edicion {
    constructor(
        private readonly servicio: Sincronizacion['edicion'],
        private readonly coordinador: Sincronizacion['coordinador'],
        private readonly unirseAProyecto: Sincronizacion['unirseAProyecto'],
    ) {}

    iniciar(datos: unknown) { return this.servicio.iniciar(datos); }
    guardar(datos: unknown) { return this.servicio.guardar(datos); }
    finalizar(datos: unknown) { return this.servicio.finalizar(datos); }
    consultar(datos: unknown) { return this.servicio.consultar(datos); }
    listarConflictos(datos: unknown) { return this.servicio.listarConflictos(datos); }
    obtenerConflicto(datos: unknown) { return this.servicio.obtenerConflicto(datos); }
    resolverConflicto(datos: unknown) { return this.servicio.resolverConflicto(datos); }

    /** Se llama al iniciar sesión: arranca la sincronización de los proyectos del usuario. */
    iniciarSincronizacion(datos: { idUsuario: number }) { return this.coordinador.iniciar(datos.idUsuario); }

    /** Unirse con enlace y empezar a vigilar el proyecto remoto. */
    async unirse(datos: UnirseDatos) {
        const proyecto = await this.unirseAProyecto.ejecutar(datos);
        if (proyecto.idRemoto) await this.coordinador.vigilar(proyecto.idProyecto, proyecto.idRemoto);
        return proyecto;
    }

    /** Al cerrar la app: libera los bloqueos tomados por este cliente. */
    cerrarTodas() { return this.servicio.cerrarTodas(); }
}