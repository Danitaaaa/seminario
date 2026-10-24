import { CrearSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/crearSesionEstudio';
import { ListarSesionesEstudio } from '../logicaPersistente/gestionDeSesionEstudio/listarSesionesEstudio';
import { ObtenerSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/obtenerSesionEstudio';
import { ModificarSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/modificarSesionEstudio';
import { IniciarSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/iniciarSesionEstudio';
import { PausarSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/pausarSesionEstudio';
import { ReanudarSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/reanudarSesionEstudio';
import { FinalizarSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/finalizarSesionEstudio';
import { EliminarSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/eliminarSesionEstudio';
import { GestionarObjetivos } from '../logicaPersistente/gestionDeSesionEstudio/gestionarObjetivos';
import { GestionarPestanas } from '../logicaPersistente/gestionDeSesionEstudio/gestionarPestanas';
import { GestionarPomodoro } from '../logicaPersistente/gestionDeSesionEstudio/gestionarPomodoro';
import { ListarOpcionesSesionEstudio } from '../logicaPersistente/gestionDeSesionEstudio/listarOpcionesSesionEstudio';
import { RegistrarMateria } from '../logicaPersistente/gestionDeSesionEstudio/registrarMateria';
import { ObtenerResumenSesiones } from '../logicaPersistente/gestionDeSesionEstudio/obtenerResumenSesiones';
import { VerificarSesionesEstudioAtrasadas } from '../logicaPersistente/gestionDeSesionEstudio/verificarSesionesEstudioAtrasadas';
import { RecuperarSesionInterrumpida } from '../logicaPersistente/gestionDeSesionEstudio/recuperarSesionInterrumpida';
import { GuardarContenidoSesion } from '../logicaPersistente/gestionDeSesionEstudio/guardarContenidoSesion';
import { ObtenerSesionEnCurso } from '../logicaPersistente/gestionDeSesionEstudio/obtenerSesionEnCurso';
import { RegistrarLatidoSesion } from '../logicaPersistente/gestionDeSesionEstudio/registrarLatidoSesion';
import {
  FasePomodoro,
  Materia,
  OpcionesSesionEstudio,
  ObjetivoSesion,
  PestanaSesion,
  ResumenSesionesEstudio,
  SesionEstudio,
} from '../logicaPersistente/gestionDeSesionEstudio/entidades';
import {
  ActualizarObjetivoDTO,
  AgregarObjetivoDTO,
  CrearPestanaDTO,
  CrearSesionEstudioDTO,
  GuardarContenidoSesionDTO,
  ListarSesionesEstudioDTO,
  ModificarSesionEstudioDTO,
  RegistrarMateriaDTO,
  RenombrarPestanaDTO,
  ResumenSesionesDTO,
} from '../logicaPersistente/gestionDeSesionEstudio/dto';

// Casos de uso del módulo, agrupados para no tener un constructor de veinte parámetros.
export interface CasosDeUsoSesionEstudio {
  crear: CrearSesionEstudio;
  listar: ListarSesionesEstudio;
  obtener: ObtenerSesionEstudio;
  modificar: ModificarSesionEstudio;
  iniciar: IniciarSesionEstudio;
  pausar: PausarSesionEstudio;
  reanudar: ReanudarSesionEstudio;
  finalizar: FinalizarSesionEstudio;
  eliminar: EliminarSesionEstudio;
  objetivos: GestionarObjetivos;
  pestanas: GestionarPestanas;
  pomodoro: GestionarPomodoro;
  opciones: ListarOpcionesSesionEstudio;
  registrarMateria: RegistrarMateria;
  resumen: ObtenerResumenSesiones;
  verificarAtrasadas: VerificarSesionesEstudioAtrasadas;
  recuperarInterrumpida: RecuperarSesionInterrumpida;
  enCurso: ObtenerSesionEnCurso;
  latido: RegistrarLatidoSesion;
  guardarContenido: GuardarContenidoSesion;
}

// Fachada "Lógica SesiónEstudio": único punto de entrada al módulo para IPC y los procesos.
export class SesionesEstudio {
  constructor(private readonly cu: CasosDeUsoSesionEstudio) {}

  async crear(idUsuario: number, datos: CrearSesionEstudioDTO): Promise<SesionEstudio> {
    return this.cu.crear.ejecutar(idUsuario, datos);
  }

  async listar(idUsuario: number, filtros: ListarSesionesEstudioDTO): Promise<SesionEstudio[]> {
    return this.cu.listar.ejecutar(idUsuario, filtros);
  }

  async abrir(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    return this.cu.obtener.ejecutar(idUsuario, idSesion);
  }

  async iniciar(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    return this.cu.iniciar.ejecutar(idUsuario, idSesion);
  }

  async pausar(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    return this.cu.pausar.ejecutar(idUsuario, idSesion);
  }

  async reanudar(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    return this.cu.reanudar.ejecutar(idUsuario, idSesion);
  }

  async finalizar(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    return this.cu.finalizar.ejecutar(idUsuario, idSesion);
  }

  async modificar(idUsuario: number, datos: ModificarSesionEstudioDTO): Promise<SesionEstudio> {
    return this.cu.modificar.ejecutar(idUsuario, datos);
  }

  async eliminar(idUsuario: number, idSesion: number): Promise<void> {
    return this.cu.eliminar.ejecutar(idUsuario, idSesion);
  }

  // ---- Pestañas del editor (cada cambio se refleja en el Word de Material) ----

  async listarPestanas(idUsuario: number, idSesion: number): Promise<PestanaSesion[]> {
    return this.cu.pestanas.listar(idUsuario, idSesion);
  }

  async crearPestana(idUsuario: number, datos: CrearPestanaDTO): Promise<PestanaSesion> {
    const pestana = await this.cu.pestanas.crear(idUsuario, datos);
    await this.sincronizarDocumento(idUsuario, datos.idSesion);
    return pestana;
  }

  async renombrarPestana(idUsuario: number, datos: RenombrarPestanaDTO): Promise<PestanaSesion> {
    const pestana = await this.cu.pestanas.renombrar(idUsuario, datos);
    await this.sincronizarDocumento(idUsuario, pestana.idSesion);
    return pestana;
  }

  async eliminarPestana(idUsuario: number, idPestana: number): Promise<void> {
    const idSesion = await this.cu.pestanas.eliminar(idUsuario, idPestana);
    await this.sincronizarDocumento(idUsuario, idSesion);
  }

  // Guarda la pestaña en la base y actualiza el Word de la sesión.
  async guardarContenido(idUsuario: number, datos: GuardarContenidoSesionDTO): Promise<PestanaSesion> {
    return this.cu.guardarContenido.ejecutar(idUsuario, datos);
  }

  // ---- Objetivos ----

  async agregarObjetivo(idUsuario: number, datos: AgregarObjetivoDTO): Promise<ObjetivoSesion> {
    return this.cu.objetivos.agregar(idUsuario, datos);
  }

  async actualizarObjetivo(idUsuario: number, datos: ActualizarObjetivoDTO): Promise<ObjetivoSesion> {
    return this.cu.objetivos.actualizar(idUsuario, datos);
  }

  async eliminarObjetivo(idUsuario: number, idObjetivo: number): Promise<void> {
    return this.cu.objetivos.eliminar(idUsuario, idObjetivo);
  }

  // ---- Pomodoro ----

  async iniciarPomodoro(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    return this.cu.pomodoro.iniciar(idUsuario, idSesion);
  }

  async pausarPomodoro(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    return this.cu.pomodoro.pausar(idUsuario, idSesion);
  }

  async reiniciarPomodoro(idUsuario: number, idSesion: number): Promise<SesionEstudio> {
    return this.cu.pomodoro.reiniciar(idUsuario, idSesion);
  }

  async cambiarFasePomodoro(idUsuario: number, idSesion: number, fase: FasePomodoro): Promise<SesionEstudio> {
    return this.cu.pomodoro.cambiarFase(idUsuario, idSesion, fase);
  }

  async completarFasePomodoro(idSesion: number): Promise<SesionEstudio | null> {
    return this.cu.pomodoro.completarFase(idSesion);
  }

  // ---- Materias, resumen y procesos de fondo ----

  async listarOpciones(): Promise<OpcionesSesionEstudio> {
    return this.cu.opciones.ejecutar();
  }

  async registrarMateria(datos: RegistrarMateriaDTO): Promise<Materia> {
    return this.cu.registrarMateria.ejecutar(datos);
  }

  async obtenerResumen(idUsuario: number, datos: ResumenSesionesDTO): Promise<ResumenSesionesEstudio> {
    return this.cu.resumen.ejecutar(idUsuario, datos);
  }

  async obtenerSesionEnCurso(idUsuario: number): Promise<SesionEstudio | null> {
    return this.cu.enCurso.ejecutar(idUsuario);
  }

  async verificarSesionesEstudioAtrasadas(): Promise<number> {
    return this.cu.verificarAtrasadas.ejecutar();
  }

  async recuperarSesionInterrumpida(segundosMaximoSinAcceso: number): Promise<number> {
    return this.cu.recuperarInterrumpida.ejecutar(segundosMaximoSinAcceso);
  }

  async registrarLatido(idUsuario: number, idSesion: number): Promise<void> {
    return this.cu.latido.ejecutar(idUsuario, idSesion);
  }

  // Si falla el Word, el cambio igual queda guardado en la base; se reintenta en el próximo guardado.
  private async sincronizarDocumento(idUsuario: number, idSesion: number): Promise<void> {
    try {
      await this.cu.guardarContenido.sincronizar(idUsuario, idSesion);
    } catch (error) {
      console.error('[SesionesEstudio] No se pudo actualizar el Word de la sesión:', error);
    }
  }
}
