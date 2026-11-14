// Worker que pasa la voz a texto con Whisper (transformers.js), sin internet.
// Corre aparte para que la pantalla no se trabe mientras transcribe.
// El modelo lo baja el main la primera vez y se lee con modelos://dictado/ (ver main/index.ts).
import { env, pipeline } from '@huggingface/transformers';
// Los .wasm de ONNX van dentro de la app (si no, transformers.js los busca en internet).
import wasm from '../../../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm?url';
import mjs from '../../../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs?url';

// Tiene que coincidir con NOMBRE_MODELO_DICTADO de main/logicaNoPersistente/dictado/modeloDictado.ts.
const MODELO = 'whisper-base';

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = 'modelos://dictado/';
env.useBrowserCache = false;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.wasmPaths = { wasm, mjs };

export interface PedidoDictado {
  id: number;
  audio: Float32Array; // mono, 16 kHz
}

export type RespuestaDictado = { id: number; texto: string } | { id: number; error: string };

type Transcriptor = (audio: Float32Array, opciones: Record<string, unknown>) => Promise<{ text: string } | { text: string }[]>;
let transcriptor: Promise<Transcriptor> | null = null;

self.onmessage = async (evento: MessageEvent<PedidoDictado>) => {
  const { id, audio } = evento.data;
  try {
    transcriptor ??= pipeline('automatic-speech-recognition', MODELO, { dtype: 'q8', device: 'wasm' }) as unknown as Promise<Transcriptor>;
    const resultado = await (await transcriptor)(audio, { language: 'spanish', task: 'transcribe', chunk_length_s: 30 });
    const texto = (Array.isArray(resultado) ? resultado[0]?.text : resultado.text) ?? '';
    self.postMessage({ id, texto: texto.trim() } satisfies RespuestaDictado);
  } catch (e) {
    transcriptor = null; // si falló al cargar, se reintenta la próxima vez
    self.postMessage({ id, error: e instanceof Error ? e.message : String(e) } satisfies RespuestaDictado);
  }
};
