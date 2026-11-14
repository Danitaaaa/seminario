import { ResumenProyectos } from '../logicaPersistente/gestionDeEstadisticas/resumenProyectos';
import { ResumenSesionesEstudio } from '../logicaPersistente/gestionDeEstadisticas/resumenSesiones';
import { ResumenDeMaterial } from '../logicaPersistente/gestionDeEstadisticas/resumenMaterial';
import { ResumenDeCuestionarios } from '../logicaPersistente/gestionDeEstadisticas/resumenCuestionarios';
import { ResumenDeFlashcards } from '../logicaPersistente/gestionDeEstadisticas/resumenFlashcards';
import { ResumenCuestionarios, ResumenFlashcards, ResumenMaterial, ResumenProyecto, ResumenSesiones } from '../logicaPersistente/gestionDeEstadisticas/entidades';
import { ResumenCuestionariosDTO, ResumenFlashcardsDTO, ResumenProyectosDTO, ResumenSesionesDTO } from '../logicaPersistente/gestionDeEstadisticas/dto';

// Punto de entrada único al módulo de estadísticas.
// Las de metas usan el caso de uso de metas (metas:estadisticas), que ya las calcula.
export class Estadisticas {
  constructor(
    private readonly resumenProyectos: ResumenProyectos,
    private readonly resumenSesiones: ResumenSesionesEstudio,
    private readonly resumenMaterial: ResumenDeMaterial,
    private readonly resumenCuestionarios: ResumenDeCuestionarios,
    private readonly resumenFlashcards: ResumenDeFlashcards
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
  async cuestionarios(datos: ResumenCuestionariosDTO): Promise<ResumenCuestionarios> {
    return this.resumenCuestionarios.ejecutar(datos);
  }
  async flashcards(datos: ResumenFlashcardsDTO): Promise<ResumenFlashcards> {
    return this.resumenFlashcards.ejecutar(datos);
  }
}
