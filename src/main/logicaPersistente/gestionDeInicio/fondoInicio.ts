import { promises as fs } from 'fs';
import path from 'path';
import { Persistencia } from '../../persistencia/persistencia';
import { FORMATOS, leerComoDataUrl } from '../gestionDeUsuarios/fotoPerfil';

// Una foto muy pesada haría lento el inicio: se acepta hasta 5 MB.
const TAMANIO_MAXIMO = 5 * 1024 * 1024;

async function rutaGuardada(persistencia: Persistencia, id: number): Promise<string | null> {
    const filas = await persistencia.ejecutar<{ fondo_inicio: string | null }>(
        `SELECT fondo_inicio FROM usuarios WHERE id_usuario = $1`,
        [id]
    );
    if (filas.length === 0) throw new Error('El usuario no existe.');
    return filas[0].fondo_inicio;
}

// Devuelve la imagen de fondo del banner como data URL, o null si el usuario no subió ninguna.
export class ObtenerFondoInicio {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(id: number): Promise<string | null> {
        const ruta = await rutaGuardada(this.persistencia, id);
        return ruta ? leerComoDataUrl(ruta) : null;
    }
}

// Copia la imagen elegida a la carpeta de la app y la deja como fondo del banner.
export class ActualizarFondoInicio {
    constructor(
        private readonly persistencia: Persistencia,
        private readonly carpeta: string
    ) {}

    async ejecutar(id: number, rutaOrigen: string): Promise<string | null> {
        const extension = path.extname(rutaOrigen).toLowerCase();
        if (!FORMATOS[extension]) throw new Error('La imagen debe ser PNG, JPG o WEBP.');

        const { size } = await fs.stat(rutaOrigen);
        if (size > TAMANIO_MAXIMO) throw new Error('La imagen puede pesar hasta 5 MB.');

        const anterior = await rutaGuardada(this.persistencia, id);
        const destino = path.join(this.carpeta, `${id}${extension}`);

        await fs.mkdir(this.carpeta, { recursive: true });
        if (anterior && anterior !== destino) await fs.rm(anterior, { force: true });
        await fs.copyFile(rutaOrigen, destino);

        await this.persistencia.ejecutar(
            `UPDATE usuarios SET fondo_inicio = $1 WHERE id_usuario = $2`,
            [destino, id]
        );
        return leerComoDataUrl(destino);
    }
}