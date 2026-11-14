// src/main/logicaNoPersistente/ia/colaEjecucion.ts
import { ErrorAbortado } from './errores.js';

export interface ContextoTarea {
  signal: AbortSignal;
  /** Informar avance: progreso(3, 8) = "parte 3 de 8". */
  progreso: (hechas: number, total: number) => void;
}

export interface EventoProgreso {
  id: string;
  estado: 'en_cola' | 'ejecutando' | 'terminado' | 'cancelado' | 'error';
  hechas?: number;
  total?: number;
}

interface Trabajo {
  id: string;
  controlador: AbortController;
  arrancar: () => void; // dispara la ejecución cuando hay lugar
  rechazar: (e: unknown) => void; // para cancelar antes de arrancar
}

export class ColaEjecucion {
  private readonly esperando: Trabajo[] = [];
  private readonly activos = new Map<string, Trabajo>();
  private readonly todos = new Map<string, Trabajo>();
  private enCurso = 0;

  constructor(
    private readonly concurrencia = 1,
    private readonly alEvento: (e: EventoProgreso) => void = () => {},
  ) {}

  add<T>(id: string, tarea: (ctx: ContextoTarea) => Promise<T>): Promise<T> {
    if (this.todos.has(id)) return Promise.reject(new Error(`Ya existe el trabajo ${id}`));

    const controlador = new AbortController();

    return new Promise<T>((resolve, reject) => {
      const trabajo: Trabajo = {
        id,
        controlador,
        rechazar: reject,
        arrancar: () => {
          this.enCurso++;
          this.activos.set(id, trabajo);
          this.alEvento({ id, estado: 'ejecutando' });

          const ctx: ContextoTarea = {
            signal: controlador.signal,
            progreso: (hechas, total) =>
              this.alEvento({ id, estado: 'ejecutando', hechas, total }),
          };

          // Promise.resolve().then(...) captura también errores síncronos de `tarea`.
          Promise.resolve()
            .then(() => tarea(ctx))
            .then(
              (valor) => {
                this.alEvento({ id, estado: 'terminado' });
                resolve(valor);
              },
              (error: unknown) => {
                this.alEvento({ id, estado: controlador.signal.aborted ? 'cancelado' : 'error' });
                reject(error);
              },
            )
            .finally(() => {
              this.activos.delete(id);
              this.todos.delete(id);
              this.enCurso--;
              this.siguiente(); // liberar el lugar es lo que mueve la cola
            });
        },
      };

      this.todos.set(id, trabajo);
      this.esperando.push(trabajo);
      this.alEvento({ id, estado: 'en_cola' });
      this.siguiente();
    });
  }

  /** Cancela un trabajo esperando o en ejecución. Devuelve false si no existe. */
  cancelar(id: string): boolean {
    const t = this.todos.get(id);
    if (!t) return false;

    const idx = this.esperando.indexOf(t);
    if (idx >= 0) {
      // Todavía no arrancó: lo sacamos de la fila y rechazamos la promesa.
      this.esperando.splice(idx, 1);
      this.todos.delete(id);
      this.alEvento({ id, estado: 'cancelado' });
      t.rechazar(new ErrorAbortado());
    } else {
      // Está corriendo: avisamos con la señal; la tarea debe respetarla.
      t.controlador.abort(new ErrorAbortado());
    }
    return true;
  }

  cancelarTodo(): void {
    for (const id of [...this.todos.keys()]) this.cancelar(id);
  }

  get pendientes(): number {
    return this.esperando.length;
  }
  get ejecutando(): number {
    return this.enCurso;
  }

  private siguiente(): void {
    while (this.enCurso < this.concurrencia) {
      const t = this.esperando.shift();
      if (!t) return;
      t.arrancar();
    }
  }
}

/** Helper para tareas largas: chequea la señal entre fragmentos. */
export async function mapearConProgreso<A, B>(
  items: A[],
  ctx: ContextoTarea,
  fn: (item: A, i: number) => Promise<B>,
): Promise<B[]> {
  const salida: B[] = [];
  for (const [i, item] of items.entries()) {
    ctx.signal.throwIfAborted(); // punto de cancelación entre fragmentos
    salida.push(await fn(item, i));
    ctx.progreso(i + 1, items.length);
  }
  return salida;
}