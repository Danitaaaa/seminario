import { COMBINAR, type ContenidoPorTipo } from './esquemas';
import type { TipoMaterialIA } from './tipos';
import { extraerTexto } from './extractorTexto';
import { fragmentar, type OpcionesFragmentador } from './fragmentador';
import type { RouterModelos } from './routerModelos';
import { mapearConProgreso, type ContextoTarea } from './colaEjecucion';
import { TAREAS_IA, type DefTarea } from './tareas';
import { armarUsuario } from './prompts';

export interface ResultadoGeneracion<T extends TipoMaterialIA = TipoMaterialIA> {
  contenido: ContenidoPorTipo[T];
  proveedores: string[];
}

// Archivo → extractor → fragmentador → router (valida con zod y reintenta) → combinar.
// No guarda nada: el resultado va a la pantalla previa.
export class GeneradorMaterialIA {
  constructor(
    private readonly router: RouterModelos,
    private readonly opcionesFragmentador?: OpcionesFragmentador,
  ) {}

  async generar<T extends TipoMaterialIA>(
    fuente: { ruta: string; extension: string; nombre: string },
    tipo: T,
    ctx: ContextoTarea,
    // Lo que el usuario escribe para ajustar el enfoque ("nivel parcial", "más corto"...).
    preferencias?: string,
  ): Promise<ResultadoGeneracion<T>> {
    const { texto } = await extraerTexto(fuente.ruta, fuente.extension);
    const fragmentos = fragmentar(texto, this.opcionesFragmentador);
    const def: DefTarea = TAREAS_IA[tipo];
    if (!def) {
      throw new Error(
        `No hay tarea de IA para "${String(tipo)}". Claves disponibles: ${Object.keys(TAREAS_IA).join(', ')}`,
      );
    }
    const usados = new Set<string>();

    // De a un fragmento: avisa "parte X de N" y se puede cancelar entre fragmentos.
    const partes = await mapearConProgreso(fragmentos, ctx, async (fragmento, i) => {
      const contexto = [
        fragmentos.length > 1 ? `Fragmento ${i + 1} de ${fragmentos.length} de "${fuente.nombre}".` : '',
        fragmento.titulo ? `Sección: ${fragmento.titulo}` : '',
      ].filter(Boolean).join('\n');

      const r = await this.router.generar(tipo, {
        sistema: def.sistema,
        usuario: armarUsuario(contexto ? `${contexto}\n\n${fragmento.texto}` : fragmento.texto, preferencias),
        esquema: def.esquema,
        esquemaJson: def.esquemaJson,
        signal: ctx.signal,
      });
      usados.add(r.proveedor);
      // El router ya lo validó con el esquema zod de la tarea.
      return r.dato as ContenidoPorTipo[T];
    });

    // Si se canceló mientras llegaba la última respuesta, no se devuelve nada.
    ctx.signal.throwIfAborted();

    const combinar = COMBINAR[tipo] as (p: ContenidoPorTipo[T][], titulo: string) => ContenidoPorTipo[T];
    return { contenido: combinar(partes, fuente.nombre), proveedores: [...usados] };
  }
}
