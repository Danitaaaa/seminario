// Modelo de Whisper para dictar (pasar la voz a texto) sin internet.
// La primera vez se descarga de Hugging Face (~75 MB) a la carpeta de la app; después se usa de ahí.
// El renderer lo carga con el protocolo modelos://dictado/ (ver index.ts) y lo corre en un worker.
import fs from 'node:fs';
import path from 'node:path';

export const NOMBRE_MODELO_DICTADO = 'whisper-base';
const ORIGEN = 'https://huggingface.co/onnx-community/whisper-base/resolve/main/';

// Lo que pide transformers.js para Whisper cuantizado (dtype q8).
const ARCHIVOS = [
  'config.json',
  'generation_config.json',
  'preprocessor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx',
];

export type Descargador = (url: string, opciones: { signal: AbortSignal }) => Promise<Response>;

// Si la descarga se queda trabada este tiempo sin recibir nada, se corta y se avisa (en vez de quedar cargando).
const SIN_DATOS_MS = 30_000;

export class ModeloDictado {
  private descarga: Promise<void> | null = null;

  constructor(
    // Carpeta donde queda el modelo (userData/dictado).
    readonly carpeta: string,
    private readonly descargar: Descargador = (url, opciones) => fetch(url, opciones),
  ) {}

  private rutaDe(archivo: string): string {
    return path.join(this.carpeta, NOMBRE_MODELO_DICTADO, ...archivo.split('/'));
  }

  listo(): boolean {
    return ARCHIVOS.every((a) => fs.existsSync(this.rutaDe(a)));
  }

  // Si falta algo, lo baja. `alProgreso` recibe de 0 a 1. Si ya se está bajando, espera esa misma descarga.
  async preparar(alProgreso: (avance: number) => void = () => {}): Promise<void> {
    if (this.listo()) return;
    this.descarga ??= this.bajarTodo(alProgreso).finally(() => {
      this.descarga = null;
    });
    return this.descarga;
  }

  private async bajarTodo(alProgreso: (avance: number) => void): Promise<void> {
    for (const [i, archivo] of ARCHIVOS.entries()) {
      const destino = this.rutaDe(archivo);
      if (!fs.existsSync(destino)) {
        await this.bajar(archivo, destino, (parte) => alProgreso((i + parte) / ARCHIVOS.length));
      }
      alProgreso((i + 1) / ARCHIVOS.length);
    }
  }

  // Se baja a un .parcial y se renombra al final: si se corta, no queda un archivo roto.
  private async bajar(archivo: string, destino: string, alProgreso: (parte: number) => void): Promise<void> {
    const corte = new AbortController();
    let vigia = setTimeout(() => corte.abort(), SIN_DATOS_MS);
    const seguir = () => {
      clearTimeout(vigia);
      vigia = setTimeout(() => corte.abort(), SIN_DATOS_MS);
    };
    try {
      await this.bajarConCorte(archivo, destino, alProgreso, corte.signal, seguir);
    } catch (e) {
      if (corte.signal.aborted) throw new Error('La descarga del dictado se trabó. Revisá la conexión y probá de nuevo.');
      throw e;
    } finally {
      clearTimeout(vigia);
    }
  }

  private async bajarConCorte(
    archivo: string,
    destino: string,
    alProgreso: (parte: number) => void,
    signal: AbortSignal,
    seguir: () => void,
  ): Promise<void> {
    const respuesta = await this.descargar(ORIGEN + archivo, { signal });
    if (!respuesta.ok || !respuesta.body) {
      throw new Error(`No se pudo descargar el modelo de dictado (${archivo}: ${respuesta.status}). Revisá la conexión.`);
    }
    await fs.promises.mkdir(path.dirname(destino), { recursive: true });
    const parcial = `${destino}.parcial`;
    const total = Number(respuesta.headers.get('content-length')) || 0;
    const salida = fs.createWriteStream(parcial);
    let recibidos = 0;
    try {
      const lector = respuesta.body.getReader();
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        seguir();
        recibidos += value.length;
        if (!salida.write(value)) await new Promise<void>((r) => salida.once('drain', () => r()));
        if (total) alProgreso(recibidos / total);
      }
      await new Promise<void>((resolver, rechazar) => salida.end((e?: Error | null) => (e ? rechazar(e) : resolver())));
      await fs.promises.rename(parcial, destino);
    } catch (e) {
      salida.destroy();
      await fs.promises.rm(parcial, { force: true });
      throw e;
    }
  }
}
