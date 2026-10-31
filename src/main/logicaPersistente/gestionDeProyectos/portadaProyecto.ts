import { promises as fs } from 'fs';
import path from 'path';
import { Persistencia } from '../../persistencia/persistencia';
import { FORMATOS, leerComoDataUrl } from '../gestionDeUsuarios/fotoPerfil';
import { exigirPermiso } from './permisos';
import { PortadaProyectoDTO } from './dto';

// Una portada muy pesada haría lento el listado: se acepta hasta 5 MB.
const TAMANIO_MAXIMO = 5 * 1024 * 1024;

// Cualquier integrante puede ver y elegir la portada: es solo de su compu.
async function rutaGuardada(persistencia: Persistencia, datos: PortadaProyectoDTO): Promise<string | null> {
    await exigirPermiso(persistencia, datos.idProyecto, datos.idUsuario, 'proyecto.obtener');
    const filas = await persistencia.ejecutar<{ ruta: string }>(
        `SELECT ruta FROM portadas_proyecto WHERE id_proyecto = $1`,
        [datos.idProyecto]
    );
    return filas[0]?.ruta ?? null;
}

// Devuelve la portada como data URL, o null si el proyecto usa los colores de la paleta.
export class ObtenerPortadaProyecto {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(datos: PortadaProyectoDTO): Promise<string | null> {
        const ruta = await rutaGuardada(this.persistencia, datos);
        return ruta ? leerComoDataUrl(ruta) : null;
    }
}

// Copia la imagen elegida a la carpeta de la app y la deja como portada del proyecto.
export class ActualizarPortadaProyecto {
    constructor(
        private readonly persistencia: Persistencia,
        private readonly carpeta: string
    ) {}

    async ejecutar(datos: PortadaProyectoDTO, rutaOrigen: string): Promise<string | null> {
        const extension = path.extname(rutaOrigen).toLowerCase();
        if (!FORMATOS[extension]) throw new Error('La imagen debe ser PNG, JPG o WEBP.');

        const { size } = await fs.stat(rutaOrigen);
        if (size > TAMANIO_MAXIMO) throw new Error('La imagen puede pesar hasta 5 MB.');

        const anterior = await rutaGuardada(this.persistencia, datos);
        const destino = path.join(this.carpeta, `${datos.idProyecto}${extension}`);

        await fs.mkdir(this.carpeta, { recursive: true });
        if (anterior && anterior !== destino) await fs.rm(anterior, { force: true });
        await fs.copyFile(rutaOrigen, destino);

        await this.persistencia.ejecutar(
            `INSERT INTO portadas_proyecto (id_proyecto, ruta) VALUES ($1, $2)
             ON CONFLICT (id_proyecto) DO UPDATE SET ruta = EXCLUDED.ruta`,
            [datos.idProyecto, destino]
        );
        return leerComoDataUrl(destino);
    }
}

// Saca la imagen: el proyecto vuelve a los colores de la paleta.
export class QuitarPortadaProyecto {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(datos: PortadaProyectoDTO): Promise<void> {
        const ruta = await rutaGuardada(this.persistencia, datos);
        if (!ruta) return;
        await fs.rm(ruta, { force: true });
        await this.persistencia.ejecutar(`DELETE FROM portadas_proyecto WHERE id_proyecto = $1`, [datos.idProyecto]);
    }
}