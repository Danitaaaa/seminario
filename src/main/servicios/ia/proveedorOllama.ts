// src/main/servicios/ia/ProveedorOllama.ts  (Gemma local)
import { ErrorProveedor, clasificar } from '../../logicaNoPersistente/ia/errores.js';
import type { PedidoCrudo, ProveedorModelo } from '../../logicaNoPersistente/ia/tipos.js';

export interface ConfigOllama {
  host?: string; // por defecto http://127.0.0.1:11434
  modelo: string; // el tag exacto que ves con `ollama list`
  timeoutMs?: number; // modelos locales son lentos: default 120 s
}

export class ProveedorOllama implements ProveedorModelo {
  readonly tipo = 'local' as const;
  private readonly host: string;
  private readonly timeoutMs: number;

  constructor(
    readonly id: string,
    private readonly cfg: ConfigOllama,
  ) {
    this.host = cfg.host ?? 'http://127.0.0.1:11434';
    this.timeoutMs = cfg.timeoutMs ?? 120_000;
  }

  /** `gemma4` y `gemma4:latest` son el mismo modelo: Ollama lista siempre el nombre con tag. */
  private coincide(nombreInstalado: string): boolean {
    const pedido = this.cfg.modelo;
    return nombreInstalado === pedido || nombreInstalado === `${pedido}:latest`;
  }

  async disponible(): Promise<boolean> {
    try {
      const r = await fetch(`${this.host}/api/tags`, { signal: AbortSignal.timeout(1500) });
      if (!r.ok) return false;
      const j = (await r.json()) as { models?: { name: string }[] };
      return (j.models ?? []).some((m) => this.coincide(m.name));
    } catch {
      return false; // Ollama apagado
    }
  }

  /** Para la pantalla de Ajustes: ¿corre Ollama? ¿está descargado el modelo? */
  async estado(): Promise<{ corriendo: boolean; modeloInstalado: boolean }> {
    try {
      const r = await fetch(`${this.host}/api/tags`, { signal: AbortSignal.timeout(1500) });
      if (!r.ok) return { corriendo: false, modeloInstalado: false };
      const j = (await r.json()) as { models?: { name: string }[] };
      return { corriendo: true, modeloInstalado: (j.models ?? []).some((m) => this.coincide(m.name)) };
    } catch {
      return { corriendo: false, modeloInstalado: false };
    }
  }

  async generarJson(p: PedidoCrudo): Promise<string> {
    // AbortSignal.any: se corta si el usuario cancela O si pasa el timeout (Node ≥ 20).
    const senales = [AbortSignal.timeout(this.timeoutMs)];
    if (p.signal) senales.push(p.signal);

    try {
      const r = await fetch(`${this.host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.any(senales),
        body: JSON.stringify({
          model: this.cfg.modelo,
          stream: false,
          format: p.esquemaJson, // salida estructurada: Ollama acepta un JSON Schema
          options: { temperature: 0.2 },
          messages: [
            { role: 'system', content: p.sistema },
            // Ollama recibe las imágenes en base64 en el mismo mensaje (Gemma las lee).
            { role: 'user', content: p.usuario, ...(p.imagenes?.length ? { images: p.imagenes } : {}) },
          ],
        }),
      });
      if (!r.ok) {
        throw Object.assign(new Error(await r.text()), { status: r.status });
      }
      const j = (await r.json()) as { message?: { content?: string } };
      const texto = j.message?.content;
      if (!texto) throw new ErrorProveedor('salida_invalida', this.id, 'Respuesta vacía');
      return texto;
    } catch (e) {
      // El timeout también aparece como TimeoutError: lo tratamos como red.
      if (e instanceof Error && e.name === 'TimeoutError')
        throw new ErrorProveedor('red', this.id, 'Ollama no respondió a tiempo', { cause: e });
      throw clasificar(e, this.id);
    }
  }
}