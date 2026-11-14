import { promises as fs } from 'fs';
import path from 'path';
import { Persistencia } from '../../persistencia/persistencia';

// Un avatar de Syntra se guarda en foto_perfil como "avatar:<id>" (el dibujo está en el renderer).
export const PREFIJO_AVATAR = 'avatar:';
const esAvatar = (valor: string) => valor.startsWith(PREFIJO_AVATAR);

// Exportados para reutilizarlos con la imagen de fondo del inicio.
export const FORMATOS: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
};

// Devuelve la imagen como data URL para que el renderer la muestre sin acceder al disco.
export async function leerComoDataUrl(ruta: string): Promise<string | null> {
    const tipo = FORMATOS[path.extname(ruta).toLowerCase()];
    if (!tipo) return null;
    try {
        const contenido = await fs.readFile(ruta);
        return `data:${tipo};base64,${contenido.toString('base64')}`;
    } catch {
        return null;
    }
}

async function rutaGuardada(persistencia: Persistencia, id: number): Promise<string | null> {
    const filas = await persistencia.ejecutar<{ foto_perfil: string | null }>(
        `SELECT foto_perfil FROM usuarios WHERE id_usuario = $1`,
        [id]
    );
    if (filas.length === 0) throw new Error('El usuario no existe.');
    return filas[0].foto_perfil;
}

export class ObtenerFotoPerfil {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(id: number): Promise<string | null> {
        const ruta = await rutaGuardada(this.persistencia, id);
        if (!ruta) return null;
        return esAvatar(ruta) ? ruta : leerComoDataUrl(ruta);
    }
}

export class ActualizarFotoPerfil {
    constructor(
        private readonly persistencia: Persistencia,
        private readonly carpeta: string
    ) {}

    async ejecutar(id: number, rutaOrigen: string): Promise<string | null> {
        const extension = path.extname(rutaOrigen).toLowerCase();
        if (!FORMATOS[extension]) throw new Error('La imagen debe ser PNG, JPG o WEBP.');

        const anterior = await rutaGuardada(this.persistencia, id);
        const destino = path.join(this.carpeta, `${id}${extension}`);

        await fs.mkdir(this.carpeta, { recursive: true });
        if (anterior && !esAvatar(anterior) && anterior !== destino) await fs.rm(anterior, { force: true });
        await fs.copyFile(rutaOrigen, destino);

        await this.persistencia.ejecutar(
            `UPDATE usuarios SET foto_perfil = $1 WHERE id_usuario = $2`,
            [destino, id]
        );
        return leerComoDataUrl(destino);
    }
}

// Elige un avatar de Syntra en lugar de una foto. Si había una foto subida, se borra.
export class ElegirAvatar {
    constructor(private readonly persistencia: Persistencia) {}

    async ejecutar(id: number, avatar: string): Promise<string> {
        const anterior = await rutaGuardada(this.persistencia, id);
        const valor = `${PREFIJO_AVATAR}${avatar}`;
        await this.persistencia.ejecutar(
            `UPDATE usuarios SET foto_perfil = $1 WHERE id_usuario = $2`,
            [valor, id]
        );
        if (anterior && !esAvatar(anterior)) await fs.rm(anterior, { force: true });
        return valor;
    }
}
