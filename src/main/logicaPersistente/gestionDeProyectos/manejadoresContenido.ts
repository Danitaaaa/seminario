import { randomUUID } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ManejadorEntidad } from './edicionCompartida';
import type { CambioPendiente } from './entidades';
import type { IPersistenciaProyectos } from './interfacesSincronizacion';
import type { Almacenamiento } from '../../persistencia/almacenamiento';

type Payload = { idGlobal?: string; datos?: Record<string, any> };

// El padre viaja por id_global; la raíz del proyecto es distinta en cada PC.
async function resolverPadre(p: IPersistenciaProyectos, idProyecto: number, d: Record<string, any>): Promise<number> {
  if (!d.padre_es_raiz && d.padre_global) {
    const f = await p.ejecutar(`SELECT id_nodo FROM nodos WHERE id_global = $1`, [d.padre_global]);
    if (f[0]) return f[0].id_nodo; // si el padre todavía no llegó, cae a la raíz
  }
  const r = await p.ejecutar(`SELECT id_nodo_raiz FROM proyectos WHERE id_proyecto = $1`, [idProyecto]);
  return r[0].id_nodo_raiz;
}

// Si el nombre ya existe en esa carpeta, agrega " (n)": un choque no puede trabar toda la sincronización.
async function conSufijo(nombre: string, f: (n: string) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < 50; i++) {
    try { await f(i === 0 ? nombre : `${nombre} (${i})`); return; }
    catch (e: any) { if (e.code !== '23505') throw e; }
  }
  throw new Error(`No se pudo generar un nombre único para "${nombre}".`);
}

/** Los nodos no son editables con versión: viajan completos por la cola. */
export class ManejadorNodo implements ManejadorEntidad {
  constructor(private p: IPersistenciaProyectos) {}

  async aplicarCambio(idProyecto: number, cambio: CambioPendiente): Promise<void> {
    const { idGlobal, datos: d } = (cambio.payload ?? {}) as Payload;
    if (!idGlobal) return;
    if (cambio.operacion === 'eliminar') {
      try { await this.p.ejecutar(`DELETE FROM nodos WHERE id_global = $1`, [idGlobal]); }
      catch (e: any) { if (e.code !== '23503') throw e; } // todavía tiene contenido local: se ignora
      return;
    }
    if (!d || !d.nombre) return;
    const idPadre = await resolverPadre(this.p, idProyecto, d);
    await conSufijo(d.nombre, nombre => this.p.ejecutar(
      `INSERT INTO nodos (id_global, nombre, fecha_carga, ultima_fecha_acceso, ultima_fecha_modificacion, tamaño, id_padre)
       VALUES ($1, $2, NOW(), NOW(), NOW(), 0, $3)
       ON CONFLICT (id_global) DO UPDATE SET
         nombre = EXCLUDED.nombre, id_padre = EXCLUDED.id_padre, ultima_fecha_modificacion = NOW()`,
      [idGlobal, nombre, idPadre]));
  }
}

/** Archivos: contenido y metadatos suben por leer() (versión con bloqueo); la cola lleva mover y eliminar. */
export class ManejadorArchivo implements ManejadorEntidad {
  constructor(private p: IPersistenciaProyectos, private almacenamiento: Almacenamiento) {}

  async leer(idProyecto: number, idGlobal: string) {
    const f = await this.p.ejecutar(
      `SELECT a.nombre, a.extension, a.ruta_fisica,
              n.id_global AS padre_global, (n.id_nodo = p.id_nodo_raiz) AS padre_es_raiz
       FROM archivos a
       JOIN nodos n ON n.id_nodo = a.id_padre
       JOIN proyectos p ON p.id_proyecto = $2
       WHERE a.id_global = $1`, [idGlobal, idProyecto]);
    if (!f[0]) return null;
    const { ruta_fisica, ...datos } = f[0];
    // ruta_fisica es RELATIVA a la carpeta de almacenamiento de esta instancia: se lee a través de Almacenamiento.
    return { datos, contenido: await this.almacenamiento.leer(ruta_fisica) };
  }

  async aplicarCambio(idProyecto: number, cambio: CambioPendiente, contenido?: Uint8Array): Promise<void> {
    const { idGlobal, datos: d } = (cambio.payload ?? {}) as Payload;
    if (!idGlobal) return;

    if (cambio.operacion === 'eliminar') {
      const f = await this.p.ejecutar(`DELETE FROM archivos WHERE id_global = $1 RETURNING ruta_fisica`, [idGlobal]);
      if (f[0]) await this.almacenamiento.eliminar(f[0].ruta_fisica).catch(console.warn);
      return;
    }
    if (!d) return;
    const idPadre = await resolverPadre(this.p, idProyecto, d);

    if (cambio.operacion === 'mover') {
      await this.p.ejecutar(
        `UPDATE archivos SET id_padre = $2, ultima_fecha_modificacion = NOW() WHERE id_global = $1`, [idGlobal, idPadre]);
      return;
    }

    const ex = (await this.p.ejecutar(`SELECT ruta_fisica FROM archivos WHERE id_global = $1`, [idGlobal]))[0];
    // El 'crear' de la cola no trae contenido: el archivo llega por el camino de versiones.
    if (!contenido && !ex) {
      console.warn('[sync] archivo sin contenido todavía, se espera la versión con contenido:', idGlobal);
      return;
    }

    let tmp: string | null = null;
    try {
      if (contenido) {
        tmp = join(tmpdir(), `sync-${randomUUID()}`);
        await writeFile(tmp, contenido);
      }
      if (ex) {
        const tamanio = tmp ? await this.almacenamiento.reemplazar(ex.ruta_fisica, tmp) : null;
        await conSufijo(d.nombre, nombre => this.p.ejecutar(
          `UPDATE archivos SET nombre = $2, id_padre = $3, tamaño = COALESCE($4, tamaño), ultima_fecha_modificacion = NOW()
           WHERE id_global = $1`, [idGlobal, nombre, idPadre, tamanio]));
      } else {
        const { rutaFisica, tamanio } = await this.almacenamiento.guardar(tmp!, d.extension);
        try {
          await conSufijo(d.nombre, nombre => this.p.ejecutar(
            `INSERT INTO archivos (id_global, nombre, extension, ruta_fisica, tamaño, id_padre)
             VALUES ($1,$2,$3,$4,$5,$6)`, [idGlobal, nombre, d.extension, rutaFisica, tamanio, idPadre]));
        } catch (e) { await this.almacenamiento.eliminar(rutaFisica).catch(() => undefined); throw e; }
      }
    } finally { if (tmp) await unlink(tmp).catch(() => undefined); }
  }
}