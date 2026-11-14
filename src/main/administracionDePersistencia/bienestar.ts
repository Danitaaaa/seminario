import { ObtenerCargaDelDia } from '../logicaPersistente/gestionDeBienestar/cargaDelDia';
import { CambiarBienestar, ObtenerBienestar } from '../logicaPersistente/gestionDeBienestar/preferenciaBienestar';
import { CargaDelDia } from '../logicaPersistente/gestionDeBienestar/entidades';
import { CambiarBienestarDTO } from '../logicaPersistente/gestionDeBienestar/dto';

// Punto de entrada al módulo de bienestar. Solo da datos: los avisos los arma el vigía de notificaciones.
export class Bienestar {
  constructor(
    private readonly obtenerCarga: ObtenerCargaDelDia,
    private readonly obtenerPreferencia: ObtenerBienestar,
    private readonly cambiarPreferencia: CambiarBienestar
  ) {}

  async activo(usuarioId: number): Promise<boolean> {
    return this.obtenerPreferencia.ejecutar({ usuarioId });
  }
  async cambiar(datos: CambiarBienestarDTO): Promise<boolean> {
    return this.cambiarPreferencia.ejecutar(datos);
  }
  // Carga del día de `ahora` (de 00:00 a 24:00 en la hora de la compu). null si el usuario desactivó los avisos.
  async cargaDeHoy(usuarioId: number, ahora: Date): Promise<CargaDelDia | null> {
    if (!(await this.activo(usuarioId))) return null;
    const desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const hasta = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
    return this.obtenerCarga.ejecutar(usuarioId, desde, hasta);
  }
}
