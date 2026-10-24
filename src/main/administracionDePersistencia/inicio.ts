import { ObtenerFondoInicio, ActualizarFondoInicio } from '../logicaPersistente/gestionDeInicio/fondoInicio';
import { FondoInicioDTO } from '../logicaPersistente/gestionDeInicio/dto';

// Punto de entrada único a lo que personaliza la pantalla de inicio.
export class Inicio {
  constructor(
    private readonly obtenerFondoInicio: ObtenerFondoInicio,
    private readonly actualizarFondoInicio: ActualizarFondoInicio
  ) {}

  async obtenerFondo(datos: FondoInicioDTO): Promise<string | null> {
    return this.obtenerFondoInicio.ejecutar(datos.id);
  }
  async actualizarFondo(id: number, rutaOrigen: string): Promise<string | null> {
    return this.actualizarFondoInicio.ejecutar(id, rutaOrigen);
  }
}