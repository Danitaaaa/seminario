import { GuardarCuentaSpotify } from '../logicaPersistente/gestionDeSpotify/guardarCuentaSpotify';
import { ObtenerCuentaSpotify } from '../logicaPersistente/gestionDeSpotify/obtenerCuentaSpotify';
import { EliminarCuentaSpotify } from '../logicaPersistente/gestionDeSpotify/eliminarCuentaSpotify';
import { CuentaSpotify } from '../logicaPersistente/gestionDeSpotify/entidades';
import { GuardarCuentaSpotifyDTO } from '../logicaPersistente/gestionDeSpotify/dto';

// Fachada de persistencia de las cuentas de Spotify vinculadas.
export class CuentasSpotify {
  constructor(
    private readonly guardarCuenta: GuardarCuentaSpotify,
    private readonly obtenerCuenta: ObtenerCuentaSpotify,
    private readonly eliminarCuenta: EliminarCuentaSpotify
  ) {}

  async guardar(datos: GuardarCuentaSpotifyDTO): Promise<void> {
    return this.guardarCuenta.ejecutar(datos);
  }

  async obtener(idUsuario: number): Promise<CuentaSpotify | null> {
    return this.obtenerCuenta.ejecutar(idUsuario);
  }

  async eliminar(idUsuario: number): Promise<void> {
    return this.eliminarCuenta.ejecutar(idUsuario);
  }
}
