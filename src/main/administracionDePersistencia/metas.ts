import { CrearMeta } from '../logicaPersistente/gestionDeMetas/crearMeta';
import { ListarMetas } from '../logicaPersistente/gestionDeMetas/listarMetas';
import { CompletarMeta } from '../logicaPersistente/gestionDeMetas/completarMeta';
import { EliminarMeta } from '../logicaPersistente/gestionDeMetas/eliminarMeta';
import { Meta } from '../logicaPersistente/gestionDeMetas/entidades';
import {
  CrearMetaDTO,
  ListarMetasDTO,
  CompletarMetaDTO,
  EliminarMetaDTO,
} from '../logicaPersistente/gestionDeMetas/dto';

// Punto de entrada único al módulo de metas — IPC nunca llama a las clases de lógica directo.
export class Metas {
  constructor(
    private readonly crearMeta: CrearMeta,
    private readonly listarMetas: ListarMetas,
    private readonly completarMeta: CompletarMeta,
    private readonly eliminarMeta: EliminarMeta
  ) {}

  async listar(datos: ListarMetasDTO): Promise<Meta[]> {
    return this.listarMetas.ejecutar(datos);
  }
  async crear(datos: CrearMetaDTO): Promise<Meta> {
    return this.crearMeta.ejecutar(datos);
  }
  async completar(datos: CompletarMetaDTO): Promise<Meta> {
    return this.completarMeta.ejecutar(datos);
  }
  async eliminar(datos: EliminarMetaDTO): Promise<void> {
    return this.eliminarMeta.ejecutar(datos);
  }
}