import { CrearSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/crearSesionEstudio';
import { ListarSesionesEstudio } from '../logicaPersistente/gestionDeSesionEstudio/listarSesionesEstudio';
import { ObtenerSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/obtenerSesionEstudio';
import { ModificarSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/modificarSesionEstudio';
import { IniciarSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/iniciarSesionEstudio';
import { FinalizarSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/finalizarSesionEstudio';
import { EliminarSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/eliminarSesionEstudio';
import { GestionarObjetivos } from '../logicaPersistente/gestionDeSesionEstudio/gestionarObjetivos';
import { ListarOpcionesSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/listarOpcionesSesionEstudio';
import { VerificarSesionesEstudioAtrasadas } from '../logicaPersistente/gestionDeSesionEstudio/verificarSesionesEstudioAtrasadas';
import { RecuperarSesionInterrumpida } from '../logicaPersistente/gestionDeSesionEstudio/recuperarSesionInterrumpida';
import { GuardarContenidoSesion } from '../logicaPersistente/gestionDeSesionEstudio/guardarContenidoSesion';
import { ObtenerSesionEnCurso } from '../logicaPersistente/gestionDeSesionEstudio/obtenerSesionEnCurso';
import { RegistrarLatidoSesion } from '../logicaPersistente/gestionDeSesionEstudio/registrarLatidoSesion';
import {
  OpcionesSesionEstudio,
  ObjetivoSesion,
  SesionEstudio,
} from '../logicaPersistente/gestionDeSesionEstudio/entidades';
import {
  ActualizarObjetivoDTO,
  AgregarObjetivoDTO,
  CrearSesionEstudioDTO,
  GuardarContenidoSesionDTO,
  ListarSesionesEstudioDTO,
  ModificarSesionEstudioDTO,
} from '../logicaPersistente/gestionDeSesionEstudio/dto';

// Fachada "Lógica SesiónEstudio": único punto de entrada al módulo para IPC y los procesos.
export class SesionesEstudio {
  constructor(
    private readonly crearSesionEstudio: CrearSesionEstudio,
    private readonly listarSesionesEstudio: ListarSesionesEstudio,
    private readonly obtenerSesionEstudio: ObtenerSesionEstudio,
    private readonly modificarSesionEstudio: ModificarSesionEstudio,
    private readonly iniciarSesionEstudio: IniciarSesionEstudio,
    private readonly finalizarSesionEstudio: FinalizarSesionEstudio,
    private readonly eliminarSesionEstudio: EliminarSesionEstudio,
    private readonly gestionarObjetivos: GestionarObjetivos,
    private readonly listarOpcionesSesionEstudio: ListarOpcionesSesionEstudio,
    private readonly verificarSesionesEstudioAtrasadasLogica: VerificarSesionesEstudioAtrasadas,
    private readonly recuperarSesionInterrumpidaLogica: RecuperarSesionInterrumpida,
    private readonly obtenerSesionEnCursoLogica: ObtenerSesionEnCurso,
    private readonly registrarLatidoSesion: RegistrarLatidoSesion,
    private readonly guardarContenidoSesion: GuardarContenidoSesion
  ) {}

  async crear(idUsuario: number, datos: CrearSesionEstudioDTO): Promise<SesionEstudio> {
    return this.crearSesionEstudio.ejecutar(idUsuario, datos);
  }

  async listar(idUsuario: number, filtros: ListarSesionesEstudioDTO): Promise<SesionEstudio[]> {
    return this.listarSesionesEstudio.ejecutar(idUsuario, filtros);
  }

  async abrir(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    return this.obtenerSesionEstudio.ejecutar(idUsuario, idSesion);
  }

  async iniciar(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    return this.iniciarSesionEstudio.ejecutar(idUsuario, idSesion);
  }

  async finalizar(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    return this.finalizarSesionEstudio.ejecutar(idUsuario, idSesion);
  }

  async modificar(idUsuario: number, datos: ModificarSesionEstudioDTO): Promise<SesionEstudio> {
    return this.modificarSesionEstudio.ejecutar(idUsuario, datos);
  }

  async guardarContenido(idUsuario: number, datos: GuardarContenidoSesionDTO): Promise<void> {
    return this.guardarContenidoSesion.ejecutar(idUsuario, datos);
  }

  async eliminar(idUsuario: number, idSesion: number): Promise<void> {
    return this.eliminarSesionEstudio.ejecutar(idUsuario, idSesion);
  }

  async agregarObjetivo(idUsuario: number, datos: AgregarObjetivoDTO): Promise<ObjetivoSesion> {
    return this.gestionarObjetivos.agregar(idUsuario, datos);
  }

  async actualizarObjetivo(idUsuario: number, datos: ActualizarObjetivoDTO): Promise<ObjetivoSesion> {
    return this.gestionarObjetivos.actualizar(idUsuario, datos);
  }

  async eliminarObjetivo(idUsuario: number, idObjetivo: number): Promise<void> {
    return this.gestionarObjetivos.eliminar(idUsuario, idObjetivo);
  }

  async listarOpciones(): Promise<OpcionesSesionEstudio> {
    return this.listarOpcionesSesionEstudio.ejecutar();
  }

  async obtenerSesionEnCurso(idUsuario: number): Promise<SesionEstudio | null> {
    return this.obtenerSesionEnCursoLogica.ejecutar(idUsuario);
  }

  async verificarSesionesEstudioAtrasadas(): Promise<number> {
    return this.verificarSesionesEstudioAtrasadasLogica.ejecutar();
  }

  async recuperarSesionInterrumpida(segundosMaximoSinAcceso: number): Promise<number> {
    return this.recuperarSesionInterrumpidaLogica.ejecutar(segundosMaximoSinAcceso);
  }

  async registrarLatido(idUsuario: number, idSesion: number): Promise<void> {
    return this.registrarLatidoSesion.ejecutar(idUsuario, idSesion);
  }
}
