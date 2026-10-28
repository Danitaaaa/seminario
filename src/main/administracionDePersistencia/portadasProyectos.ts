import {
  ObtenerPortadaProyecto,
  ActualizarPortadaProyecto,
  QuitarPortadaProyecto,
} from '../logicaPersistente/gestionDeProyectos/portadaProyecto';
import { PortadaProyectoDTO } from '../logicaPersistente/gestionDeProyectos/dto';

// Punto de entrada único a las portadas de los proyectos.
export class PortadasProyectos {
  constructor(
    private readonly obtenerPortada: ObtenerPortadaProyecto,
    private readonly actualizarPortada: ActualizarPortadaProyecto,
    private readonly quitarPortada: QuitarPortadaProyecto
  ) {}

  async obtener(datos: PortadaProyectoDTO): Promise<string | null> {
    return this.obtenerPortada.ejecutar(datos);
  }
  async actualizar(datos: PortadaProyectoDTO, rutaOrigen: string): Promise<string | null> {
    return this.actualizarPortada.ejecutar(datos, rutaOrigen);
  }
  async quitar(datos: PortadaProyectoDTO): Promise<void> {
    return this.quitarPortada.ejecutar(datos);
  }
}