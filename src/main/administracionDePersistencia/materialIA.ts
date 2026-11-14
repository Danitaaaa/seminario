import type { Archivos } from './archivos';
import { GuardarMaterialIA } from '../logicaPersistente/gestionDeMaterialIA/guardarMaterialIA';
import { ListarMaterialesIA } from '../logicaPersistente/gestionDeMaterialIA/listarMaterialesIA';
import { ObtenerMaterialIA } from '../logicaPersistente/gestionDeMaterialIA/obtenerMaterialIA';
import { EliminarMaterialIA } from '../logicaPersistente/gestionDeMaterialIA/eliminarMaterialIA';
import { EditarMapaMentalIA } from '../logicaPersistente/gestionDeMaterialIA/editarMapaMentalIA';
import { ListarIntentosCuestionario, ResponderCuestionario } from '../logicaPersistente/gestionDeMaterialIA/intentosCuestionario';
import { paraResolver } from '../logicaPersistente/gestionDeMaterialIA/corregirCuestionario';
import { GuardarGuiaPreguntas } from '../logicaPersistente/gestionDeMaterialIA/guardarGuiaPreguntas';
import { GuardarResumenIA } from '../logicaPersistente/gestionDeMaterialIA/guardarResumenIA';
import {
  armarPreferencias,
  guiaPreguntasAHtml,
  nombreMazoDe,
  preguntasDeGuia,
  resumenAHtml,
  tarjetasDePropuesta,
} from '../logicaPersistente/gestionDeMaterialIA/propuestas';
import type {
  IntentoCuestionario,
  MaterialIA as MaterialGuardado,
  PropuestaIA,
} from '../logicaPersistente/gestionDeMaterialIA/entidades';
import {
  editarMapaMentalIASchema,
  generarMaterialIASchema,
  guardarMaterialIASchema,
  listarMaterialesIASchema,
  materialIASchema,
  responderCuestionarioSchema,
  trabajoIASchema,
} from '../logicaPersistente/gestionDeMaterialIA/dto';
import type { GenerarMaterialIADTO } from '../logicaPersistente/gestionDeMaterialIA/dto';
import { Almacenamiento } from '../persistencia/almacenamiento';
import { usuarioSesionSync } from '../sesionSync';
import {
  cuestionarioSchema,
  generarFlashcardsSchema,
  generarGuiaSchema,
  generarResumenDocumentoSchema,
  guardarGuiaSchema,
  guardarResumenDocumentoSchema,
  leerCuestionarioGuardado,
  leerPlanIASchema,
} from '../logicaNoPersistente/ia/esquemas';
import { TAREAS_IA } from '../logicaNoPersistente/ia/tareas';
import { esFuenteIA, type TipoMaterialIA } from '../logicaNoPersistente/ia/tipos';
import { esAbort } from '../logicaNoPersistente/ia/errores';
import type { ColaEjecucion } from '../logicaNoPersistente/ia/colaEjecucion';
import { GeneradorMaterialIA } from '../logicaNoPersistente/ia/generadorMaterialIA';
import type { ServicioIA } from '../logicaNoPersistente/ia/servicioIA.js';
import { aMateriasLeidas } from '../logicaNoPersistente/lectorPlanEstudios/planConIA.js';

interface Pendiente {
  idUsuario: number;
  idArchivo: number;
  tipo: TipoMaterialIA;
  proveedores: string[];
}

// Un cuestionario guardado viaja al front sin las respuestas correctas ni las explicaciones:
// así no se pueden ver antes de resolverlo.
function sinRespuestas(material: MaterialGuardado): MaterialGuardado {
  if (material.tipo !== 'cuestionario') return material;
  return { ...material, contenido: paraResolver(leerCuestionarioGuardado(material.contenido)) as never };
}

// Para las listas: un cuestionario que no se puede leer igual aparece (para poder eliminarlo),
// sin contenido, en lugar de romper la lista entera.
function sinRespuestasParaLista(material: MaterialGuardado): MaterialGuardado {
  try {
    return sinRespuestas(material);
  } catch {
    return { ...material, contenido: null as never };
  }
}

// Cancelar no es un error: se devuelve { ok: false, cancelado: true } para que el front no muestre un cartel.
const CANCELADO = { ok: false as const, cancelado: true as const };

function usuarioActual(): number {
  const id = usuarioSesionSync();
  if (id == null) throw new Error('No hay una sesión iniciada.');
  return id;
}

// Único punto de entrada de todo lo de "Material con IA" (material, flashcards, guía de preguntas, plan de estudio).
// El IPC solo le pasa los datos tal cual llegan: la validación se hace acá con los esquemas de logicaNoPersistente/ia/esquemas.
export class MaterialIA {
  // Propuestas esperando revisión. Solo se puede guardar algo que pasó por acá:
  // nada se guarda sin pasar por la pantalla previa.
  private readonly pendientes = new Map<string, Pendiente>();

  constructor(
    // Material de estudio también se consulta a través de su clase de administracionDePersistencia.
    private readonly archivos: Archivos,
    private readonly almacenamiento: Almacenamiento,
    private readonly generador: GeneradorMaterialIA,
    // La misma cola de toda la IA: el progreso sale por 'ia:progreso' y se cancela con 'ia:cancelar'.
    private readonly cola: ColaEjecucion,
    private readonly guardarCasoUso: GuardarMaterialIA,
    private readonly listarCasoUso: ListarMaterialesIA,
    private readonly obtenerCasoUso: ObtenerMaterialIA,
    private readonly eliminarCasoUso: EliminarMaterialIA,
    private readonly responderCasoUso: ResponderCuestionario,
    private readonly listarIntentosCasoUso: ListarIntentosCuestionario,
    private readonly editarMapaCasoUso: EditarMapaMentalIA,
    private readonly guardarGuiaCasoUso: GuardarGuiaPreguntas,
    // Para el análisis del plan de estudio (no parte de un archivo, parte de un texto).
    private readonly servicioIA: ServicioIA,
    private readonly guardarResumenCasoUso: GuardarResumenIA,
  ) {}

  /* ---------------- Material con IA (resumen, cuestionario, mapa mental) ---------------- */

  async generar(datos: unknown) {
    const dto = generarMaterialIASchema.parse(datos);
    return this.conCancelacion(async () => ({ ok: true as const, propuesta: await this.generarPropuesta(dto) }));
  }

  // Guarda la versión que el usuario revisó y editó en la pantalla previa.
  async guardar(datos: unknown): Promise<MaterialGuardado> {
    const dto = guardarMaterialIASchema.parse(datos);
    const idUsuario = usuarioActual();
    const pendiente = this.pendientes.get(dto.trabajoId);
    if (!pendiente || pendiente.idUsuario !== idUsuario) {
      throw new Error('No hay una propuesta de la IA para guardar. Volvé a generarla.');
    }

    // Se vuelve a validar acá: no se confía en lo que manda el front.
    // El esquema de cada tipo sale del registro único de tareas (tareas.ts).
    const resultado = TAREAS_IA[pendiente.tipo].esquema.safeParse(dto.contenido);
    if (!resultado.success) {
      throw new Error(`Revisá estos datos: ${[...new Set(resultado.error.issues.map((i) => i.message))].join(' ')}`);
    }

    const guardado = await this.guardarCasoUso.ejecutar({
      idUsuario,
      idArchivo: pendiente.idArchivo,
      tipo: pendiente.tipo,
      contenido: resultado.data,
      proveedores: pendiente.proveedores,
    });
    this.pendientes.delete(dto.trabajoId);
    return guardado;
  }

  async listar(datos: unknown): Promise<MaterialGuardado[]> {
    const dto = listarMaterialesIASchema.parse(datos ?? {});
    const lista = await this.listarCasoUso.ejecutar(usuarioActual(), { idArchivo: dto.idArchivo, tipo: dto.tipo });
    // Los cuestionarios van sin las respuestas correctas (se ven recién al corregir).
    return lista.map(sinRespuestasParaLista);
  }

  // Sirve para cerrar cualquier pantalla previa sin guardar (material, flashcards o guía).
  descartar(datos: unknown): boolean {
    return this.pendientes.delete(trabajoIASchema.parse(datos).trabajoId);
  }

  /* ---------------- Flashcards con IA ---------------- */

  // Devuelve las tarjetas para revisarlas y editarlas; no guarda nada.
  async generarFlashcards(datos: unknown) {
    const d = generarFlashcardsSchema.parse(datos);
    const preferencias = armarPreferencias(
      d.cantidad ? `Generá aproximadamente ${d.cantidad} flashcards, con pregunta y respuesta breves.` : null,
      d.indicaciones,
    );
    return this.conCancelacion(async () => {
      const propuesta = await this.generarPropuesta({
        trabajoId: d.trabajoId,
        idArchivo: d.idArchivo,
        tipo: 'flashcards',
        ...(preferencias ? { preferencias } : {}),
      });
      return {
        ok: true as const,
        trabajoId: propuesta.trabajoId,
        nombreMazo: nombreMazoDe(propuesta.fuente),
        tarjetas: tarjetasDePropuesta(propuesta.contenido),
        proveedores: propuesta.proveedores,
      };
    });
  }

  /* ---------------- Guía de preguntas ---------------- */

  // Devuelve la guía como HTML editable; no guarda nada.
  async generarGuia(datos: unknown) {
    const d = generarGuiaSchema.parse(datos);
    const preferencias = armarPreferencias(d.cantidad ? `Generá ${d.cantidad} preguntas.` : null, d.indicaciones);
    return this.conCancelacion(async () => {
      const propuesta = await this.generarPropuesta({
        trabajoId: d.trabajoId,
        idArchivo: d.idArchivo,
        tipo: 'guia',
        ...(preferencias ? { preferencias } : {}),
      });
      const nombreBase = nombreMazoDe(propuesta.fuente);
      const preguntas = preguntasDeGuia(propuesta.contenido);
      return {
        ok: true as const,
        trabajoId: propuesta.trabajoId,
        nombreArchivo: `Guía de preguntas - ${nombreBase}`,
        totalPreguntas: preguntas.length,
        html: guiaPreguntasAHtml(`Guía de preguntas: ${nombreBase}`, preguntas),
        proveedores: propuesta.proveedores,
      };
    });
  }

  // Guarda la guía ya revisada/editada en la carpeta elegida (idPadre). Sirve igual desde
  // "Métodos de estudio / Guía" que desde Material de estudio: es el mismo canal.
  async guardarGuia(datos: unknown) {
    const d = guardarGuiaSchema.parse(datos);
    const archivo = await this.guardarGuiaCasoUso.ejecutar({
      nombre: d.nombre,
      html: d.html,
    });
    // La propuesta ya no hace falta en memoria.
    if (d.trabajoId) this.pendientes.delete(d.trabajoId);
    return { ok: true as const, archivo };
  }

  /* ---------------- Resumen como documento ---------------- */

  // Igual que la guía: la IA arma el resumen, se devuelve como HTML editable y no se guarda nada.
  async generarResumenDocumento(datos: unknown) {
    const d = generarResumenDocumentoSchema.parse(datos);
    return this.conCancelacion(async () => {
      const propuesta = await this.generarPropuesta({
        trabajoId: d.trabajoId,
        idArchivo: d.idArchivo,
        tipo: 'resumen',
        ...(d.indicaciones ? { preferencias: d.indicaciones } : {}),
      });
      return {
        ok: true as const,
        trabajoId: propuesta.trabajoId,
        nombreArchivo: `Resumen - ${nombreMazoDe(propuesta.fuente)}`,
        html: resumenAHtml(propuesta.contenido),
        proveedores: propuesta.proveedores,
      };
    });
  }

  // Guarda el resumen ya revisado/editado como Word en la carpeta "Resúmenes" de Material.
  async guardarResumenDocumento(datos: unknown) {
    const d = guardarResumenDocumentoSchema.parse(datos);
    const archivo = await this.guardarResumenCasoUso.ejecutar({ nombre: d.nombre, html: d.html });
    for (const trabajoId of d.trabajosIds ?? []) this.pendientes.delete(trabajoId);
    return { ok: true as const, archivo };
  }

  /* ---------------- Materias desde el plan de estudio ---------------- */

  // Devuelve las materias leídas para revisarlas y editarlas antes de crearlas; no guarda nada.
  // El lector manual (leerPlanEstudios) sigue siendo el camino sin IA.
  async leerPlan(datos: unknown) {
    const { trabajoId, texto } = leerPlanIASchema.parse(datos);
    const r = await this.servicioIA.generar({ idTrabajo: trabajoId, tarea: 'materias', texto });
    if (!r.ok) return r; // { ok:false, causa, mensaje }: 'cancelado', 'sin_proveedor', 'sin_contenido_valido'…
    try {
      return { ok: true as const, materias: aMateriasLeidas(r.dato.contenido), proveedores: r.dato.proveedores };
    } catch (e) {
      return { ok: false as const, causa: 'sin_contenido_valido', mensaje: e instanceof Error ? e.message : String(e) };
    }
  }

  /* ---------------- Internos ---------------- */

  private async generarPropuesta(datos: GenerarMaterialIADTO): Promise<PropuestaIA> {
    const idUsuario = usuarioActual();
    // Pasa por Archivos (como el resto de la app): chequea el permiso 'archivo.ver' si es de un proyecto.
    const archivo = await this.archivos.obtener({ id: datos.idArchivo });
    if (!esFuenteIA(archivo.extension)) throw new Error('Solo se puede usar la IA con archivos PDF y DOCX.');

    const ruta = this.almacenamiento.rutaCompleta(archivo.rutaFisica);
    const { contenido, proveedores } = await this.cola.add(datos.trabajoId, (ctx) =>
      this.generador.generar(
        { ruta, extension: archivo.extension, nombre: archivo.nombre },
        datos.tipo,
        ctx,
        datos.preferencias,
      ),
    );

    if (datos.tipo === 'cuestionario') {
      const guardado = await this.guardarCasoUso.ejecutar({
        idUsuario,
        idArchivo: archivo.id,
        tipo: 'cuestionario',
        contenido: cuestionarioSchema.parse(contenido),
        proveedores,
      });
      return {
        trabajoId: datos.trabajoId,
        idArchivo: archivo.id,
        fuente: archivo.nombre,
        tipo: datos.tipo,
        contenido: sinRespuestas(guardado).contenido,
        proveedores,
        idMaterialIA: guardado.idMaterialIA,
      };
    }

    this.pendientes.set(datos.trabajoId, { idUsuario, idArchivo: archivo.id, tipo: datos.tipo, proveedores });
    return {
      trabajoId: datos.trabajoId,
      idArchivo: archivo.id,
      fuente: archivo.nombre,
      tipo: datos.tipo,
      contenido,
      proveedores,
    };
  }

  private async conCancelacion<T extends object>(trabajo: () => Promise<T>): Promise<T | typeof CANCELADO> {
    try {
      return await trabajo();
    } catch (error) {
      if (esAbort(error)) return CANCELADO;
      throw error;
    }
  }

  /* ---------------- Ver, eliminar y editar lo guardado; resolver cuestionarios ---------------- */

  async obtener(datos: unknown): Promise<MaterialGuardado> {
    const { idMaterialIA } = materialIASchema.parse(datos);
    return sinRespuestas(await this.obtenerCasoUso.ejecutar(usuarioActual(), idMaterialIA));
  }

  async eliminar(datos: unknown): Promise<true> {
    const { idMaterialIA } = materialIASchema.parse(datos);
    await this.eliminarCasoUso.ejecutar(usuarioActual(), idMaterialIA);
    return true;
  }

  // Mapas mentales: guarda lo que el usuario editó (ideas nuevas, eliminadas o cambiadas).
  async editarMapaMental(datos: unknown): Promise<MaterialGuardado> {
    const dto = editarMapaMentalIASchema.parse(datos);
    return this.editarMapaCasoUso.ejecutar(usuarioActual(), dto.idMaterialIA, dto.contenido);
  }

  // Corrige en el main: las respuestas correctas recién llegan al front con el resultado.
  async responderCuestionario(datos: unknown) {
    const dto = responderCuestionarioSchema.parse(datos);
    return this.responderCasoUso.ejecutar(usuarioActual(), dto.idMaterialIA, dto.respuestas);
  }

  async listarIntentos(datos: unknown): Promise<IntentoCuestionario[]> {
    const { idMaterialIA } = materialIASchema.parse(datos);
    return this.listarIntentosCasoUso.ejecutar(usuarioActual(), idMaterialIA);
  }
}
