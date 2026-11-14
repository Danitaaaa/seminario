// src/main/logicaNoPersistente/ia/index.ts  — "raíz de composición": acá se arma todo
import { app, net, safeStorage } from 'electron';
import { join } from 'node:path';
import { AlmacenClaves } from '../../servicios/ia/almacenClaves.js';
import { ProveedorGptMini } from '../../servicios/ia/proveedorGptMini.js'; // <-- Ruta corregida según tu estructura
import { GestorOllama, normalizarHost, type EventoOllama } from '../../servicios/ia/gestorOllama.js';
import { InstaladorOllama, URL_DESCARGA_OLLAMA, type ProgresoInstalacion } from '../../servicios/ia/instaladorOllama.js';
import { ProveedorOllama } from '../../servicios/ia/proveedorOllama.js';
import { ColaEjecucion, type EventoProgreso } from './colaEjecucion.js';
import { RouterModelos } from './routerModelos.js';
import { TAREAS, type Tarea } from './tipos.js';

export interface OpcionesServiciosIA {
  /** Se llama en cada cambio de estado/progreso de un trabajo (el main lo manda a la ventana). */
  alProgreso?: (e: EventoProgreso) => void;
  /** Estado de Ollama (iniciando, listo, falta_modelo, descargando...) para mostrarlo en la pantalla. */
  alOllama?: (e: EventoOllama) => void;
}

export function crearServiciosIA(opciones: OpcionesServiciosIA = {}) {
  // userData ya es distinto por instancia si arrancás con --user-data-dir o setPath (ver README)
  const claves = new AlmacenClaves(join(app.getPath('userData'), 'ia-claves.json'), safeStorage);

  // En desarrollo se permite caer al .env; empaquetada, solo la clave que cargó el usuario
  const clave = (id: string, envVar: string) => () => {
    try {
      return claves.obtener(id) ?? (app.isPackaged ? undefined : process.env[envVar]);
    } catch {
      return undefined; // clave ilegible: se trata como "sin clave"
    }
  };

  // OLLAMA_HOST suele escribirse sin "http://": se normaliza para no romper el fetch
  const hostOllama = normalizarHost(process.env.OLLAMA_HOST);
  const modeloOllama = process.env.OLLAMA_MODELO ?? 'gemma4:e2b'; // por defecto el liviano; se puede cambiar en .env
  const ollama = new ProveedorOllama('gemma', { host: hostOllama, modelo: modeloOllama });
  
  // Instalador del paquete independiente de Ollama: queda en userData/ollama (sin administrador, sin tocar el PATH).
  const instalador = new InstaladorOllama({ carpetaInstalacion: join(app.getPath('userData'), 'ollama') });
  const instalar = (alProgreso: (p: ProgresoInstalacion) => void, senal: AbortSignal) =>
    instalador.instalar(alProgreso, senal);

  // Al abrir la app: instala Ollama si falta, lo inicia y DESCARGA el modelo si falta (~4,6 GB, una sola vez).
  const gestorOllama = new GestorOllama({
    host: hostOllama,
    modelo: modeloOllama,
    estado: () => ollama.estado(),
    alEvento: opciones.alOllama,
    autoDescargar: process.env.OLLAMA_AUTO_DESCARGA !== '0',
    urlDescarga: URL_DESCARGA_OLLAMA,
    comando: () => instalador.rutaEjecutable() ?? 'ollama',
    ...(instalador.soportado ? { instalar, autoInstalar: process.env.OLLAMA_AUTO_INSTALAR !== '0' } : {}),
  });

  const proveedores = [
    new ProveedorGptMini({
      baseURL: process.env.AZURE_RECURSO ?? '',
      despliegue: process.env.AZURE_DESPLIEGUE ?? 'gpt-5-mini',
      obtenerClave: clave('gptMini', 'AZURE_OPENAI_API_KEY'), // Nota: el ID del almacén ahora coincide con el readonly id ('gptMini')
    }),
    ollama,
  ];

  // GptMini principal ('gptMini') → Gemma si no hay conexión, no hay clave de Azure o GptMini falla
  const porDefecto = ['gptMini', 'gemma'];
  const cadenas = Object.fromEntries(TAREAS.map((t) => [t, porDefecto])) as Record<Tarea, string[]>;

  const router = new RouterModelos(proveedores, {
    cadenas,
    hayInternet: () => net.isOnline(),
    reintentosSalida: 1,
    alEvento: (e) => console.log('[ia]', e),
  });

  const cola = new ColaEjecucion(2, opciones.alProgreso);
  return { claves, router, cola, ollama, gestorOllama };
}

export type ServiciosIA = ReturnType<typeof crearServiciosIA>;