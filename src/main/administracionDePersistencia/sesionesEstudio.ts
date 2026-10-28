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
import { GestionarMaterias } from '../logicaPersistente/gestionDeSesionEstudio/gestionarMaterias';
import { BuscarSesionesSuperpuestas } from '../logicaPersistente/gestionDeSesionEstudio/buscarSesionesSuperpuestas';
import { ObtenerResumenSesiones } from '../logicaPersistente/gestionDeSesionEstudio/obtenerResumenSesiones';
import { VerificarSesionesEstudioAtrasadas } from '../logicaPersistente/gestionDeSesionEstudio/verificarSesionesEstudioAtrasadas';
import { RecuperarSesionInterrumpida } from '../logicaPersistente/gestionDeSesionEstudio/recuperarSesionInterrumpida';
import { GuardarContenidoSesion } from '../logicaPersistente/gestionDeSesionEstudio/guardarContenidoSesion';
import { ImportarContenidoDesdeMaterial } from '../logicaPersistente/gestionDeSesionEstudio/importarContenidoDesdeMaterial';
import { ObtenerSesionEnCurso } from '../logicaPersistente/gestionDeSesionEstudio/obtenerSesionEnCurso';
import { RegistrarLatidoSesion } from '../logicaPersistente/gestionDeSesionEstudio/registrarLatidoSesion';
import {
  FasePomodoro,
  MateriaConUso,
  OpcionesSesionEstudio,
  ObjetivoSesion,
  PestanaSesion,
  ResumenSesionesEstudio,
  SesionEstudio,
} from '../logicaPersistente/gestionDeSesionEstudio/entidades';
import {
  ActualizarObjetivoDTO,
  AgregarObjetivoDTO,
  BuscarSuperpuestasDTO,
  CrearPestanaDTO,
  CrearSesionEstudioDTO,
  GuardarContenidoSesionDTO,
  ListarSesionesEstudioDTO,
  ModificarMateriaDTO,
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
  metas: GestionarObjetivos;
  pestanas: GestionarPestanas;
  pomodoro: GestionarPomodoro;
  opciones: ListarOpcionesSesionEstudio;
  materias: GestionarMaterias;
  superpuestas: BuscarSesionesSuperpuestas;
  resumen: ObtenerResumenSesiones;
  verificarAtrasadas: VerificarSesionesEstudioAtrasadas;
  recuperarInterrumpida: RecuperarSesionInterrumpida;
  enCurso: ObtenerSesionEnCurso;
  latido: RegistrarLatidoSesion;
  guardarContenido: GuardarContenidoSesion;
  importarDesdeMaterial: ImportarContenidoDesdeMaterial;
}

// portada lógica SesiónEstudio
export class SesionesEstudio {
  constructor(private readonly cu: CasosDeUsoSesionEstudio) {}

  async crear(idUsuario: number, datos: CrearSesionEstudioDTO): Promise<SesionEstudio> {
    return this.cu.crear.ejecutar(idUsuario, datos);
  }

  async listar(idUsuario: number, filtros: ListarSesionesEstudioDTO): Promise<SesionEstudio[]> {
    return this.cu.listar.ejecutar(idUsuario, filtros);
  }

  async buscarSuperpuestas(idUsuario: number, datos: BuscarSuperpuestasDTO): Promise<SesionEstudio[]> {
    return this.cu.superpuestas.ejecutar(idUsuario, datos);
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

  // Pestañas del editor

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

  // Se llama cuando se edita un Word desde Material: si es el de una sesión, la actualiza.
  async importarDesdeMaterial(idArchivo: number, html: string): Promise<boolean> {
    return this.cu.importarDesdeMaterial.ejecutar(idArchivo, html);
  }
  // Metas 

  async agregarObjetivo(idUsuario: number, datos: AgregarObjetivoDTO): Promise<ObjetivoSesion> {
    return this.cu.metas.agregar(idUsuario, datos);
  }

  async actualizarObjetivo(idUsuario: number, datos: ActualizarObjetivoDTO): Promise<ObjetivoSesion> {
    return this.cu.metas.actualizar(idUsuario, datos);
  }

  async eliminarObjetivo(idUsuario: number, idObjetivo: number): Promise<void> {
    return this.cu.metas.eliminar(idUsuario, idObjetivo);
  }

  // Pomodoro

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

  async listarMaterias(idUsuario: number): Promise<MateriaConUso[]> {
    return this.cu.materias.listar(idUsuario);
  }

  async registrarMateria(datos: RegistrarMateriaDTO): Promise<MateriaConUso> {
    return this.cu.materias.registrar(datos);
  }

  async modificarMateria(idUsuario: number, datos: ModificarMateriaDTO): Promise<MateriaConUso> {
    return this.cu.materias.modificar(idUsuario, datos);
  }

  async eliminarMateria(idMateria: number): Promise<void> {
    return this.cu.materias.eliminar(idMateria);
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
