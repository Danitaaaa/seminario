// src/main/servicios/ia/GestorOllama.ts
// Deja a Ollama listo cuando arranca la app: si falta lo instala en la carpeta de la app (paquete independiente,
// ver InstaladorOllama), si está apagado lo inicia y, si falta el modelo, lo descarga.
import { spawn, type ChildProcess } from 'node:child_process';
import type { ProgresoInstalacion } from './instaladorOllama.js';

export type EventoOllama =
  | { tipo: 'iniciando' }
  | { tipo: 'instalando'; fase: 'descargando' | 'instalando'; porcentaje: number | null } // porcentaje solo al descargar
  | { tipo: 'listo' }
  | { tipo: 'no_instalado'; urlDescarga?: string } // no hay Ollama y no se instaló solo: la pantalla puede mostrar el link
  | { tipo: 'no_arranco' } // existe pero no respondió a tiempo
  | { tipo: 'falta_modelo' } // corre, pero el modelo no está descargado
  | { tipo: 'descargando'; estado: string; porcentaje: number | null }
  | { tipo: 'error'; mensaje: string; urlDescarga?: string }; // urlDescarga solo si falló la instalación automática

export interface OpcionesGestorOllama {
  host: string; // ya normalizado: http://127.0.0.1:11434
  modelo: string; // gemma4:e2b
  estado: () => Promise<{ corriendo: boolean; modeloInstalado: boolean }>;
  alEvento?: (e: EventoOllama) => void;
  /** Descargar sin preguntar. Solo para desarrollo/demos: son ~4,6 GB. Default false. */
  autoDescargar?: boolean;
  /** Instala Ollama cuando falta. Si no se pasa (sistema sin paquete independiente), solo se avisa `no_instalado`. */
  instalar?: (alProgreso: (p: ProgresoInstalacion) => void, senal: AbortSignal) => Promise<void>;
  /** Instalar sin preguntar cuando falta Ollama. Default false. Requiere `instalar`. */
  autoInstalar?: boolean;
  /** Ejecutable a lanzar. Tras instalar el PATH de este proceso no cambia: conviene devolver la ruta completa. */
  comando?: () => string;
  /** Link para que la pantalla ofrezca la descarga manual cuando no se pudo instalar solo. */
  urlDescarga?: string;
  /** Espera tras instalar, solo para instaladores que dejan a Ollama arrancando por su cuenta. Default 0: el paquete independiente no arranca solo. */
  esperaTrasInstalarMs?: number;
  lanzar?: () => ChildProcess; // inyectable para tests
  esperaArranqueMs?: number; // default 15 s
  pausaMs?: number; // default 500 ms
}

/** OLLAMA_HOST suele escribirse sin "http://" (ej. 127.0.0.1:11434) o como 0.0.0.0. */
export function normalizarHost(valor?: string): string {
  const v = (valor ?? '').trim();
  if (!v) return 'http://127.0.0.1:11434';
  const conEsquema = /^https?:\/\//i.test(v) ? v : `http://${v}`;
  return conEsquema.replace('//0.0.0.0', '//127.0.0.1').replace(/\/+$/, '');
}

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class GestorOllama {
  private hijo: ChildProcess | null = null; // solo si NOSOTROS lo iniciamos
  private descarga: AbortController | null = null;
  private instalacion: AbortController | null = null;
  /** Último estado conocido: la pantalla lo consulta al abrir (puede haberse perdido el evento). */
  ultimo: EventoOllama | null = null;

  constructor(private readonly o: OpcionesGestorOllama) {}

  private emitir(e: EventoOllama): void {
    this.ultimo = e;
    this.o.alEvento?.(e);
  }

  private eventoNoInstalado(): EventoOllama {
    return this.o.urlDescarga ? { tipo: 'no_instalado', urlDescarga: this.o.urlDescarga } : { tipo: 'no_instalado' };
  }

  /** Para llamar al arrancar SIN await: nunca lanza ni frena la app. */
  async preparar(): Promise<void> {
    console.log("preparando instalación ollama");
    try {
      this.emitir({ tipo: 'iniciando' });
  
      let arranque = await this.asegurarCorriendo();
      if (arranque === 'no_instalado' && this.o.instalar && this.o.autoInstalar) {
        const r = await this.instalarOllama();
        console.log("instalador ollama terminó");
        if (!r.ok) return; // instalarOllama ya avisó (error o cancelado)
        arranque = await this.asegurarCorriendo();
      }
      if (arranque === 'no_instalado') return this.emitir(this.eventoNoInstalado());
      if (arranque !== 'ok') return this.emitir({ tipo: arranque });

      if ((await this.o.estado()).modeloInstalado) return this.emitir({ tipo: 'listo' });
      if (this.o.autoDescargar) {
        await this.descargarModelo();
        return;
      }
      this.emitir({ tipo: 'falta_modelo' });
    } catch (e) {
      console.log('[ollama]', JSON.stringify(e));
      this.emitir({ tipo: 'error', mensaje: e instanceof Error ? e.message : String(e) });
    }
  }

  /** Si Ollama no responde, lo inicia (`ollama serve`) y espera a que conteste. */
  async asegurarCorriendo(): Promise<'ok' | 'no_instalado' | 'no_arranco'> {
    if ((await this.o.estado()).corriendo) return 'ok';

    const lanzar = this.o.lanzar ?? (() => spawn(this.o.comando?.() ?? 'ollama', ['serve'], { stdio: 'ignore', windowsHide: true }));
    let hijo: ChildProcess;
    try {
      hijo = lanzar();
    } catch {
      return 'no_instalado';
    }
    let noInstalado = false;
    let salio = false;
    // Sin este handler, un "ollama" inexistente tira la app abajo (evento 'error' sin escuchar).
    hijo.on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'ENOENT') noInstalado = true;
      else salio = true;
    });
    hijo.on('exit', () => {
      salio = true;
    });
    this.hijo = hijo;

    const limite = Date.now() + (this.o.esperaArranqueMs ?? 15_000);
    while (Date.now() < limite) {
      if (noInstalado) {
        this.hijo = null;
        return 'no_instalado';
      }
      if (salio) break;
      if ((await this.o.estado()).corriendo) return 'ok';
      await dormir(this.o.pausaMs ?? 500);
    }
    // Si nuestro `ollama serve` se cerró enseguida, puede ser porque ya había otro Ollama levantándose
    // (puerto ocupado): se le da un momento antes de darlo por fallido.
    if (salio && (await this.esperarRespuesta(3_000))) {
      this.hijo = null;
      return 'ok';
    }
    this.detener(); // lo que iniciamos y no respondió, no se deja huérfano
    return 'no_arranco';
  }

  /** Espera a que Ollama conteste, hasta `ms`. */
  private async esperarRespuesta(ms: number): Promise<boolean> {
    const limite = Date.now() + ms;
    while (Date.now() < limite) {
      if ((await this.o.estado()).corriendo) return true;
      await dormir(this.o.pausaMs ?? 500);
    }
    return (await this.o.estado()).corriendo;
  }

  /** Descarga e instala Ollama con progreso. Se puede cancelar la descarga con cancelarInstalacion(). */
  async instalarOllama(): Promise<{ ok: true } | { ok: false; mensaje: string }> {
    if (!this.o.instalar) return { ok: false, mensaje: 'La instalación automática no está disponible en este sistema' };
    if (this.instalacion) return { ok: false, mensaje: 'Ya hay una instalación en curso' };
    const control = new AbortController();
    this.instalacion = control;
    let ultimaClave = '';
    try {
      this.emitir({ tipo: 'instalando', fase: 'descargando', porcentaje: null });
      await this.o.instalar((p) => {
        const porcentaje = p.fase === 'descargando' ? p.porcentaje : null;
        const clave = `${p.fase}:${porcentaje}`;
        console.log(clave);
        if (clave === ultimaClave) return; // no se repite el mismo aviso
        ultimaClave = clave;
        this.emitir({ tipo: 'instalando', fase: p.fase, porcentaje });
      }, control.signal);
      // Algunos instaladores dejan a Ollama arrancando solo: si se configuró una espera, se da antes de lanzar uno propio.
      await this.esperarRespuesta(this.o.esperaTrasInstalarMs ?? 0);
      return { ok: true };
    } catch (e) {
      if (control.signal.aborted) {
        this.emitir(this.eventoNoInstalado());
        return { ok: false, mensaje: 'Instalación cancelada' };
      }
      const mensaje = e instanceof Error ? e.message : String(e);
      this.emitir(this.o.urlDescarga ? { tipo: 'error', mensaje, urlDescarga: this.o.urlDescarga } : { tipo: 'error', mensaje });
      return { ok: false, mensaje };
    } finally {
      this.instalacion = null;
    }
  }

  /** Cancela la instalación (descarga o descompresión). Es seguro: se arma en una carpeta aparte que se descarta. */
  cancelarInstalacion(): void {
    this.instalacion?.abort();
  }

  /** Descarga el modelo con progreso. Se puede cancelar con cancelarDescarga(). */
  async descargarModelo(): Promise<{ ok: true } | { ok: false; mensaje: string }> {
    if (this.descarga) return { ok: false, mensaje: 'Ya hay una descarga en curso' };
    const control = new AbortController();
    this.descarga = control;
    let ultimoPct = -1;
    let ultimoEstado = '';

    const procesar = (linea: string): void => {
      if (!linea.trim()) return;
      let j: { status?: string; total?: number; completed?: number; error?: string };
      try {
        j = JSON.parse(linea);
      } catch {
        return; // línea cortada o ruido: se ignora
      }
      if (j.error) throw new Error(j.error);
      const pct = j.total && j.completed !== undefined ? Math.round((j.completed / j.total) * 100) : null;
      const estado = j.status ?? '';
      // Se avisa solo si cambió algo: Ollama manda cientos de líneas por segundo
      if (pct === ultimoPct && estado === ultimoEstado) return;
      ultimoPct = pct ?? -1;
      ultimoEstado = estado;
      this.emitir({ tipo: 'descargando', estado, porcentaje: pct });
    };

    try {
      this.emitir({ tipo: 'descargando', estado: 'conectando', porcentaje: null });
      const r = await fetch(`${this.o.host}/api/pull`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.o.modelo, stream: true }),
        signal: control.signal,
      });
      if (!r.ok || !r.body) throw new Error(`Ollama respondió ${r.status}`);

      const lector = r.body.getReader();
      const decodificador = new TextDecoder();
      let resto = '';
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        resto += decodificador.decode(value, { stream: true });
        const lineas = resto.split('\n');
        resto = lineas.pop() ?? '';
        lineas.forEach(procesar);
      }
      procesar(resto);
      this.emitir({ tipo: 'listo' });
      return { ok: true };
    } catch (e) {
      if (control.signal.aborted) {
        this.emitir({ tipo: 'falta_modelo' });
        return { ok: false, mensaje: 'Descarga cancelada' };
      }
      const mensaje = e instanceof Error ? e.message : String(e);
      this.emitir({ tipo: 'error', mensaje });
      return { ok: false, mensaje };
    } finally {
      this.descarga = null;
    }
  }

  cancelarDescarga(): void {
    this.descarga?.abort();
  }

  /** Al cerrar la app: apaga SOLO el Ollama que iniciamos nosotros (no el que ya estaba corriendo). */
  detener(): void {
    this.cancelarDescarga();
    this.cancelarInstalacion();
    this.hijo?.kill();
    this.hijo = null;
  }
}