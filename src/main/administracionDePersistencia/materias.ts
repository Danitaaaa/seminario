import { ListarFormaciones } from '../logicaPersistente/gestionDeMaterias/listarFormaciones';
import { CrearFormacion } from '../logicaPersistente/gestionDeMaterias/crearFormacion';
import { ModificarFormacion } from '../logicaPersistente/gestionDeMaterias/modificarFormacion';
import { EliminarFormacion } from '../logicaPersistente/gestionDeMaterias/eliminarFormacion';
import { ListarMaterias } from '../logicaPersistente/gestionDeMaterias/listarMaterias';
import { CrearMaterias } from '../logicaPersistente/gestionDeMaterias/crearMaterias';
import { ModificarMateria } from '../logicaPersistente/gestionDeMaterias/modificarMateria';
import { EliminarMateria } from '../logicaPersistente/gestionDeMaterias/eliminarMateria';
import { ListarMateriasUsuario, OpcionMateria } from '../logicaPersistente/gestionDeMaterias/listarMateriasUsuario';
import { ListarCorrelativas } from '../logicaPersistente/gestionDeMaterias/listarCorrelativas';
import { GuardarCorrelativas } from '../logicaPersistente/gestionDeMaterias/guardarCorrelativas';
import { ListarCuatrimestres } from '../logicaPersistente/gestionDeMaterias/listarCuatrimestres';
import { GuardarCuatrimestre } from '../logicaPersistente/gestionDeMaterias/guardarCuatrimestre';
import { EliminarCuatrimestre } from '../logicaPersistente/gestionDeMaterias/eliminarCuatrimestre';
import { RecursarMateria } from '../logicaPersistente/gestionDeMaterias/recursarMateria';
import { Correlativa, CuatrimestreCursada, Formacion, MateriaFormacion } from '../logicaPersistente/gestionDeMaterias/entidades';
import {
  CrearFormacionDTO, CrearMateriasDTO, CuatrimestreDTO, FormacionDTO, GuardarCorrelativasDTO, GuardarCuatrimestreDTO,
  LeerPlanDTO, MateriaDTO, ModificarFormacionDTO, ModificarMateriaDTO, RecursarDTO, UsuarioDTO,
} from '../logicaPersistente/gestionDeMaterias/dto';
import { leerPlanEstudios, MateriaLeida } from '../logicaNoPersistente/lectorPlanEstudios/leerPlanEstudios';

export class Materias {
  constructor(
    private readonly listarFormaciones: ListarFormaciones,
    private readonly crearFormacion: CrearFormacion,
    private readonly modificarFormacion: ModificarFormacion,
    private readonly eliminarFormacion: EliminarFormacion,
    private readonly listarMaterias: ListarMaterias,
    private readonly crearMaterias: CrearMaterias,
    private readonly modificarMateria: ModificarMateria,
    private readonly eliminarMateria: EliminarMateria,
    private readonly listarMateriasUsuario: ListarMateriasUsuario,
    private readonly listarCorrelativas: ListarCorrelativas,
    private readonly guardarCorrelativas: GuardarCorrelativas,
    private readonly listarCuatrimestres: ListarCuatrimestres,
    private readonly guardarCuatrimestre: GuardarCuatrimestre,
    private readonly eliminarCuatrimestre: EliminarCuatrimestre,
    private readonly recursarMateria: RecursarMateria
  ) {}

  formaciones(datos: UsuarioDTO): Promise<Formacion[]> { return this.listarFormaciones.ejecutar(datos); }
  nuevaFormacion(datos: CrearFormacionDTO): Promise<Formacion> { return this.crearFormacion.ejecutar(datos); }
  editarFormacion(datos: ModificarFormacionDTO): Promise<Formacion> { return this.modificarFormacion.ejecutar(datos); }
  borrarFormacion(datos: FormacionDTO): Promise<void> { return this.eliminarFormacion.ejecutar(datos); }

  materias(datos: FormacionDTO): Promise<MateriaFormacion[]> { return this.listarMaterias.ejecutar(datos); }
  nuevasMaterias(datos: CrearMateriasDTO): Promise<MateriaFormacion[]> { return this.crearMaterias.ejecutar(datos); }
  editarMateria(datos: ModificarMateriaDTO): Promise<MateriaFormacion> { return this.modificarMateria.ejecutar(datos); }
  borrarMateria(datos: MateriaDTO): Promise<void> { return this.eliminarMateria.ejecutar(datos); }
  todasLasMaterias(datos: UsuarioDTO): Promise<OpcionMateria[]> { return this.listarMateriasUsuario.ejecutar(datos); }

  correlativas(datos: FormacionDTO): Promise<Correlativa[]> { return this.listarCorrelativas.ejecutar(datos); }
  editarCorrelativas(datos: GuardarCorrelativasDTO): Promise<Correlativa[]> { return this.guardarCorrelativas.ejecutar(datos); }

  // Cuatrimestres de cursada del usuario (valen para todas sus formaciones).
  cuatrimestres(datos: UsuarioDTO): Promise<CuatrimestreCursada[]> { return this.listarCuatrimestres.ejecutar(datos); }
  guardarCuatrimestreCursada(datos: GuardarCuatrimestreDTO): Promise<CuatrimestreCursada> { return this.guardarCuatrimestre.ejecutar(datos); }
  borrarCuatrimestre(datos: CuatrimestreDTO): Promise<void> { return this.eliminarCuatrimestre.ejecutar(datos); }
  recursar(datos: RecursarDTO): Promise<{ idCuaderno: number }> { return this.recursarMateria.ejecutar(datos); }

  leerPlan(datos: LeerPlanDTO): MateriaLeida[] { return leerPlanEstudios(datos.texto); }
}
