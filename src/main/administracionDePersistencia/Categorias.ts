import { CrearCategoria } from '../logicaPersistente/gestionDeCategorias/crearCategoria';
import { ListarCategorias } from '../logicaPersistente/gestionDeCategorias/listarCategorias';
import { ModificarCategoria } from '../logicaPersistente/gestionDeCategorias/modificarCategoria';
import { EliminarCategoria } from '../logicaPersistente/gestionDeCategorias/eliminarCategoria';
import { Categoria } from '../logicaPersistente/gestionDeCategorias/entidades';
import {
  CrearCategoriaDTO,
  ListarCategoriasDTO,
  ModificarCategoriaDTO,
  EliminarCategoriaDTO,
} from '../logicaPersistente/gestionDeCategorias/dto';

export class Categorias {
  constructor(
    private readonly crearCategoria: CrearCategoria,
    private readonly listarCategorias: ListarCategorias,
    private readonly modificarCategoria: ModificarCategoria,
    private readonly eliminarCategoria: EliminarCategoria
  ) {}

  async crear(datos: CrearCategoriaDTO): Promise<Categoria> {
    return this.crearCategoria.ejecutar(datos);
  }
  async listar(datos: ListarCategoriasDTO): Promise<Categoria[]> {
    return this.listarCategorias.ejecutar(datos);
  }
  async modificar(datos: ModificarCategoriaDTO): Promise<Categoria> {
    return this.modificarCategoria.ejecutar(datos);
  }
  async eliminar(datos: EliminarCategoriaDTO): Promise<void> {
    return this.eliminarCategoria.ejecutar(datos);
  }
}
