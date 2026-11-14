// src/main/logicaNoPersistente/ia/proveedores/proveedorLuna.ts  (Azure OpenAI / Foundry, GPT-5-mini)
import OpenAI from 'openai';
import { ErrorProveedor, clasificar } from '../../logicaNoPersistente/ia/errores.js';
import type { PedidoCrudo, ProveedorModelo } from '../../logicaNoPersistente/ia/tipos.js';

export interface ConfigGptMini {
  /**
   * Endpoint tal como lo tengas en el .env. Sirve cualquiera de estos:
   *  - https://RECURSO.services.ai.azure.com/openai/v1/responses     (se recorta a .../openai/v1/)
   *  - https://RECURSO.services.ai.azure.com/openai/v1/
   *  - https://RECURSO.services.ai.azure.com/api/projects/PROYECTO   (endpoint del proyecto de Foundry)
   *  - https://RECURSO.openai.azure.com/                             (API clásica, con api-version)
   */
  baseURL: string;
  /** Nombre del DESPLIEGUE en Azure (no el del modelo), por ejemplo "gpt-5-mini". */
  despliegue: string;
  obtenerClave: () => string | undefined;
}

const API_VERSION_CLASICA = '2025-04-01-preview'; // mínima para modelos de razonamiento y structured outputs

interface Destino {
  baseURL: string;
  /** Solo la API clásica de Azure necesita api-version. */
  apiVersion: string | null;
}

// Convierte lo que haya en el .env en la URL que realmente entiende el SDK de OpenAI.
function resolverDestino(baseURL: string, despliegue: string): Destino {
  const limpia = (baseURL ?? '').trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  if (!/^https?:\/\//.test(limpia)) {
    throw new Error(`El endpoint de Azure es inválido o está vacío (valor: "${baseURL}"). Tiene que empezar con https://`);
  }
  const url = new URL(limpia);

  // API v1 (con o sin /responses o /chat/completions al final): la base es siempre .../openai/v1/
  if (/\/openai\/v1(\/|$)/.test(url.pathname)) return { baseURL: `${url.origin}/openai/v1/`, apiVersion: null };

  // Ruta clásica por despliegue: se respeta tal cual.
  if (/\/openai\/deployments\//.test(url.pathname)) {
    return { baseURL: `${url.origin}${url.pathname}`, apiVersion: API_VERSION_CLASICA };
  }

  // Endpoint del proyecto de Foundry (.services.ai.azure.com/api/projects/...): se usa la API v1 del recurso.
  if (url.hostname.endsWith('.services.ai.azure.com')) {
    return { baseURL: `${url.origin}/openai/v1/`, apiVersion: null };
  }

  // Recurso de Azure OpenAI clásico (.openai.azure.com): ruta por despliegue + api-version.
  return { baseURL: `${url.origin}/openai/deployments/${encodeURIComponent(despliegue)}`, apiVersion: API_VERSION_CLASICA };
}

// Los PNG en base64 empiezan con "iVBOR"; el resto se manda como JPEG.
const tipoImagen = (b64: string) => (b64.startsWith('iVBOR') ? 'image/png' : 'image/jpeg');

export class ProveedorGptMini implements ProveedorModelo {
  readonly id = 'gptMini';
  readonly tipo = 'online' as const;

  constructor(private readonly cfg: ConfigGptMini) {}

  async disponible(): Promise<boolean> {
    return Boolean(this.cfg.obtenerClave());
  }

  async generarJson(p: PedidoCrudo): Promise<string> {
    const apiKey = this.cfg.obtenerClave();
    if (!apiKey) throw new ErrorProveedor('sin_clave', this.id, 'Falta la clave de Azure');

    try {
      const destino = resolverDestino(this.cfg.baseURL, this.cfg.despliegue);
      console.log('[gptMini] destino:', destino.baseURL, destino.apiVersion ?? '(sin api-version)', 'despliegue:', this.cfg.despliegue);

      const cliente = new OpenAI({
        apiKey,
        baseURL: destino.baseURL,
        ...(destino.apiVersion ? { defaultQuery: { 'api-version': destino.apiVersion } } : {}),
        defaultHeaders: { 'api-key': apiKey },
      });

      const r = await cliente.chat.completions.create(
        {
          model: this.cfg.despliegue, // nombre del despliegue, por ejemplo "gpt-5-mini"
          messages: [
            { role: 'system', content: p.sistema },
            {
              role: 'user',
              // Con imágenes (plan escaneado), el texto y cada imagen van como partes del mismo mensaje.
              content: p.imagenes?.length
                ? [
                    { type: 'text' as const, text: p.usuario },
                    ...p.imagenes.map((b64) => ({
                      type: 'image_url' as const,
                      image_url: { url: `data:${tipoImagen(b64)};base64,${b64}` },
                    })),
                  ]
                : p.usuario,
            },
          ],
          // gpt-5-mini es de razonamiento: no se manda temperature ni max_tokens.
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'salida', strict: true, schema: p.esquemaJson as Record<string, unknown> },
          },
        },
        { signal: p.signal },
      );
      const texto = r.choices[0]?.message.content;
      if (!texto) throw new ErrorProveedor('salida_invalida', this.id, 'Respuesta vacía');
      return texto;
    } catch (e) {
      if (e instanceof ErrorProveedor) throw e;
      const err = e as { status?: number; message?: string; error?: unknown; code?: string; cause?: unknown };
      console.error('[gptMini] error crudo:', err.status, err.code, err.message, JSON.stringify(err.error), err.cause);
      throw clasificar(e, this.id);
    }
  }
}