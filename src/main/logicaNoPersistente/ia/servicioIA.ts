// src/main/logicaNoPersistente/ia/ServicioIA.ts
// Casos de uso de la IA. El IPC solo valida y llama acá (igual que eventos.ipc.ts con la clase Eventos).
import { ErrorClaves, type AlmacenClaves } from '../../servicios/ia/almacenClaves.js';
import type { EventoOllama, GestorOllama } from '../../servicios/ia/gestorOllama.js';
import type { ProveedorOllama } from '../../servicios/ia/proveedorOllama.js';
import { mapearConProgreso, type ColaEjecucion } from './colaEjecucion.js';
import {
  fallo,
  type GenerarDTO,
  type ProveedorCualquiera,
  type ProveedorOnline,
  type RespuestaIA,
  type ResultadoIA,
} from './dto.js';
import { ErrorRouter, esAbort } from './errores.js';
import { fragmentarEnTextos } from './fragmentador.js';
import { armarUsuario } from './prompts.js';
import type { RouterModelos } from './routerModelos.js';
import { TAREAS_IA, type DefTarea } from './tareas.js';

export interface DependenciasServicioIA {
  claves: AlmacenClaves;
  router: RouterModelos;
  cola: ColaEjecucion;
  ollama: ProveedorOllama;
  gestorOllama: GestorOllama;
}

export class ServicioIA {
  constructor(private readonly d: DependenciasServicioIA) {}

  // --- Generar ---------------------------------------------------------------------------------------------

  async generar(pedido: GenerarDTO): Promise<RespuestaIA<ResultadoIA<unknown>>> {
    const def: DefTarea = TAREAS_IA[pedido.tarea]; // anotar el tipo evita que TS infiera una unión de esquemas
    try {
      const partes = await this.d.cola.add(pedido.idTrabajo, async (ctx) => {
        const fragmentos = fragmentarEnTextos(pedido.texto);
        return mapearConProgreso(fragmentos, ctx, async (frag) => {
          const r = await this.d.router.generar(pedido.tarea, {
            sistema: def.sistema,
            usuario: armarUsuario(frag, pedido.preferencias),
            esquema: def.esquema,
            esquemaJson: def.esquemaJson,
            signal: ctx.signal,
          });
          return { dato: r.dato, proveedor: r.proveedor };
        });
      });
      // Une los fragmentos en un solo resultado y descarta lo que no cumple las validaciones de contenido
      let contenido: unknown;
      try {
        contenido = def.combinar(partes.map((x) => x.dato), pedido.texto);
      } catch (e) {
        return fallo('sin_contenido_valido', e);
      }
      return { ok: true, dato: { contenido, proveedores: [...new Set(partes.map((x) => x.proveedor))] } };
    } catch (e) {
      if (esAbort(e)) return { ok: false, causa: 'cancelado', mensaje: 'Cancelado' };
      if (e instanceof ErrorRouter) return fallo('sin_proveedor', e);
      return fallo('desconocido', e);
    }
  }

  cancelar(idTrabajo: string): boolean {
    return this.d.cola.cancelar(idTrabajo);
  }

  // --- Claves: el renderer puede GUARDAR y consultar si existe. Nunca LEERLA completa. ----------------------

  guardarClave(proveedor: ProveedorOnline, clave: string): RespuestaIA<true> {
    try {
      this.d.claves.establecer(proveedor, clave);
      return { ok: true, dato: true };
    } catch (e) {
      return fallo(e instanceof ErrorClaves ? e.codigo : 'desconocido', e);
    }
  }

  tieneClave(proveedor: ProveedorOnline): boolean {
    return this.d.claves.existe(proveedor);
  }

  claveEnmascarada(proveedor: ProveedorOnline): string | undefined {
    return this.d.claves.enmascarada(proveedor);
  }

  borrarClave(proveedor: ProveedorOnline): true {
    this.d.claves.borrar(proveedor);
    return true;
  }

  // --- Pantalla de Ajustes -----------------------------------------------------------------------------------

  probarConexion(proveedor: ProveedorCualquiera) {
    return this.d.router.probar(proveedor, AbortSignal.timeout(15_000)); // → { ok: true, ms } ó { ok: false, ms, causa }
  }

  estadoOllama() {
    return this.d.ollama.estado(); // → { corriendo, modeloInstalado }
  }

  // --- Ollama: estado, descarga del modelo, cancelar y reintentar ------------------------------------------

  /** Evento más reciente (por si la pantalla llegó tarde). */
  ollamaUltimo(): EventoOllama | null {
    return this.d.gestorOllama.ultimo;
  }

  ollamaDescargar() {
    return this.d.gestorOllama.descargarModelo(); // tarda: avisa por ia:ollama
  }

  ollamaCancelar(): true {
    this.d.gestorOllama.cancelarDescarga();
    return true;
  }

  ollamaReintentar(): void {
    void this.d.gestorOllama.preparar();
  }
}