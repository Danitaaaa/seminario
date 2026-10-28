import { ResumenProyectos } from '../logicaPersistente/gestionDeEstadisticas/resumenProyectos';
import { ResumenSesionesEstudio } from '../logicaPersistente/gestionDeEstadisticas/resumenSesiones';
import { ResumenDeMaterial } from '../logicaPersistente/gestionDeEstadisticas/resumenMaterial';
import { ResumenMaterial, ResumenProyecto, ResumenSesiones } from '../logicaPersistente/gestionDeEstadisticas/entidades';
import { ResumenProyectosDTO, ResumenSesionesDTO } from '../logicaPersistente/gestionDeEstadisticas/dto';

// Punto de entrada único al módulo de estadísticas.
// Las de metas usan el caso de uso de metas (metas:estadisticas), que ya las calcula.
export class Estadisticas {
  constructor(
    private readonly resumenProyectos: ResumenProyectos,
    private readonly resumenSesiones: ResumenSesionesEstudio,
    private readonly resumenMaterial: ResumenDeMaterial
  ) {}

  async proyectos(datos: ResumenProyectosDTO): Promise<ResumenProyecto[]> {
    return this.resumenProyectos.ejecutar(datos);
  }
  async sesiones(datos: ResumenSesionesDTO): Promise<ResumenSesiones> {
    return this.resumenSesiones.ejecutar(datos);
  }
  async material(): Promise<ResumenMaterial> {
    return this.resumenMaterial.ejecutar();
  }
}
