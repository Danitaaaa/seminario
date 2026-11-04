import { CrearCategoria } from '../logicaPersistente/gestionDeCategorias/crearCategoria';
import { ListarCategorias } from '../logicaPersistente/gestionDeCategorias/listarCategorias';
import { ModificarCategoria } from '../logicaPersistente/gestionDeCategorias/modificarCategoria';
import { EliminarCategoria } from '../logicaPersistente/gestionDeCategorias/eliminarCategoria';
import type {
  CrearCategoriaDTO, ListarCategoriasDTO, ModificarCategoriaDTO, EliminarCategoriaDTO,
} from '../logicaPersistente/gestionDeCategorias/dto';

export class Categorias {
  constructor(
    private readonly crearCategoria: CrearCategoria,
    private readonly listarCategorias: ListarCategorias,
    private readonly modificarCategoria: ModificarCategoria,
    private readonly eliminarCategoria: EliminarCategoria,
  ) {}

  crear(datos: CrearCategoriaDTO) { return this.crearCategoria.ejecutar(datos); }
  listar(datos: ListarCategoriasDTO) { return this.listarCategorias.ejecutar(datos); }
  modificar(datos: ModificarCategoriaDTO) { return this.modificarCategoria.ejecutar(datos); }
  eliminar(datos: EliminarCategoriaDTO) { return this.eliminarCategoria.ejecutar(datos); }
}