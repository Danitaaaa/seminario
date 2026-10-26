import type { Notificacion } from '../../logicaPersistente/gestionDeNotificaciones/entidades';
import type { CrearNotificacionDTO } from '../../logicaPersistente/gestionDeNotificaciones/dto';

export interface RepositorioNotificaciones {
  crear(datos: CrearNotificacionDTO): Promise<Notificacion | null>;
  estaSilenciado(usuarioId: number): Promise<boolean>;
}

// Punto único para avisar algo. Sesiones y proyectos lo van a usar así:
//   notificador.notificar({ usuarioId, tipo: 'sesion', titulo: '¡Terminó tu sesión!', mensaje: '...', clave: `sesion:${id}` })
export class Notificador {
  constructor(
    private readonly repositorio: RepositorioNotificaciones,
    // Muestra el aviso en las notificaciones de la compu.
    private readonly mostrarEnSistema: (notificacion: Notificacion) => void,
    // Avisa a la ventana para que la campanita se actualice.
    private readonly avisarVentana: (usuarioId: number) => void,
  ) {}

  async notificar(datos: CrearNotificacionDTO): Promise<Notificacion | null> {
    const notificacion = await this.repositorio.crear(datos);
    if (!notificacion) return null;
    if (!(await this.repositorio.estaSilenciado(datos.usuarioId))) this.mostrarEnSistema(notificacion);
    this.avisarVentana(datos.usuarioId);
    return notificacion;
  }
}