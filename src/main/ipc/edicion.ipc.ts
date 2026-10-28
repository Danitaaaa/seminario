import { ipcMain } from 'electron';
import { aResultado } from '../logicaPersistente/gestionDeProyectos/erroresSincronizacion';
import { UnirseAProyectoDTOSchema } from '../logicaPersistente/gestionDeProyectos/dto';
import type { Edicion } from '../administracionDePersistencia/edicion';
import { fijarSesionSync } from '../sesionSync';

/**
 * Los canales nuevos devuelven { ok, datos } | { ok:false, codigo, mensaje } porque los errores
 * personalizados pierden sus campos al cruzar IPC.
 * 'proyectos:sincronizar' ya está registrado en proyectos.ipc.ts: no se repite acá.
 */
export function registerEdicionIpc(edicion: Edicion): void {
    const canal = (nombre: string, f: (datos: any) => Promise<unknown>) =>
        ipcMain.handle(nombre, (_e, datos) => aResultado(() => f(datos)));

    canal('edicion:iniciar', d => edicion.iniciar(d));
    canal('edicion:guardar', d => edicion.guardar(d));
    canal('edicion:finalizar', d => edicion.finalizar(d));
    canal('edicion:consultar', d => edicion.consultar(d));
    canal('edicion:listarConflictos', d => edicion.listarConflictos(d));
    canal('edicion:obtenerConflicto', d => edicion.obtenerConflicto(d));
    canal('edicion:resolverConflicto', d => edicion.resolverConflicto(d));

    // El renderer manda { idUsuario, password? } al iniciar sesión. La contraseña se usa solo para
    // conectar con el servidor de sincronización y no se pasa más adelante.
    canal('sincronizacion:iniciar', d => {
        const { password, ...resto } = (d ?? {}) as { idUsuario: number; password?: string };
        fijarSesionSync(resto.idUsuario, password);
        return edicion.iniciarSincronizacion(resto);
    });

    // Único registro de 'proyectos:unirse'. Mismo estilo que los canales de proyectos:
    // valida con el schema y lanza si falla.
    ipcMain.handle('proyectos:unirse', async (_e, datos: unknown) => {
        const validado = UnirseAProyectoDTOSchema.parse(datos);
        return edicion.unirse(validado);
    });
}