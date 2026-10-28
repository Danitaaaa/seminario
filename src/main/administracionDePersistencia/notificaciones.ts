import { CrearNotificacion } from '../logicaPersistente/gestionDeNotificaciones/crearNotificacion';
import { ListarNotificaciones } from '../logicaPersistente/gestionDeNotificaciones/listarNotificaciones';
import { MarcarLeidas } from '../logicaPersistente/gestionDeNotificaciones/marcarLeidas';
import { BorrarLeidas } from '../logicaPersistente/gestionDeNotificaciones/borrarLeidas';
import { ObtenerSilencio, CambiarSilencio } from '../logicaPersistente/gestionDeNotificaciones/silencio';
import { Notificacion } from '../logicaPersistente/gestionDeNotificaciones/entidades';
import {
  CrearNotificacionDTO,
  UsuarioDTO,
  MarcarLeidasDTO,
  SilenciarDTO,
} from '../logicaPersistente/gestionDeNotificaciones/dto';

// Punto de entrada único al módulo de notificaciones — IPC nunca llama a las clases de lógica directo.
export class Notificaciones {
  constructor(
    private readonly crearNotificacion: CrearNotificacion,
    private readonly listarNotificaciones: ListarNotificaciones,
    private readonly marcarLeidasNotificaciones: MarcarLeidas,
    private readonly obtenerSilencio: ObtenerSilencio,
    private readonly cambiarSilencio: CambiarSilencio,
    private readonly borrarLeidasNotificaciones: BorrarLeidas
  ) {}

  async crear(datos: CrearNotificacionDTO): Promise<Notificacion | null> {
    return this.crearNotificacion.ejecutar(datos);
  }
  async listar(datos: UsuarioDTO): Promise<Notificacion[]> {
    return this.listarNotificaciones.ejecutar(datos);
  }
  async marcarLeidas(datos: MarcarLeidasDTO): Promise<void> {
    return this.marcarLeidasNotificaciones.ejecutar(datos);
  }
  async borrarLeidas(datos: UsuarioDTO): Promise<void> {
    return this.borrarLeidasNotificaciones.ejecutar(datos);
  }
  async estaSilenciado(usuarioId: number): Promise<boolean> {
    return this.obtenerSilencio.ejecutar({ usuarioId });
  }
  async silenciar(datos: SilenciarDTO): Promise<boolean> {
    return this.cambiarSilencio.ejecutar(datos);
  }
}