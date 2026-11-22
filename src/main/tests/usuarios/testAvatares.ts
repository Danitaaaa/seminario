import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Persistencia } from '../../persistencia/persistencia';
import { ActualizarFotoPerfil, ElegirAvatar, ObtenerFotoPerfil } from '../../logicaPersistente/gestionDeUsuarios/fotoPerfil';
import { ElegirColorAvatar } from '../../logicaPersistente/gestionDeUsuarios/colorAvatar';
import { elegirAvatarSchema, elegirColorAvatarSchema } from '../../logicaPersistente/gestionDeUsuarios/dto';

const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};
async function esperarError(accion: () => Promise<unknown>, esperado: string): Promise<void> {
    try {
        await accion();
    } catch (error) {
        comprobar(error instanceof Error && error.message === esperado,
            `Se esperaba "${esperado}" y se recibió "${String(error)}"`);
        return;
    }
    throw new Error(`Se esperaba el error "${esperado}"`);
}

// Simula la tabla usuarios con un solo usuario (id 1): guarda la foto/avatar y el color.
function persistenciaFalsa(fotoInicial: string | null = null, existe = true) {
    const usuario = { foto: fotoInicial, color: null as number | null };
    const persistencia = {
        async ejecutar(sql: string, valores: unknown[] = []) {
            if (!existe) return [];
            if (sql.includes('SELECT foto_perfil')) return [{ foto_perfil: usuario.foto }];
            if (sql.includes('SET foto_perfil')) usuario.foto = valores[0] as string;
            if (sql.includes('SET color_avatar')) usuario.color = valores[0] as number | null;
            return [{ id_usuario: 1 }];
        },
    } as unknown as Persistencia;
    return { persistencia, usuario };
}

const carpetaTemporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'syntra-avatares-'));

function imagenDePrueba(carpeta: string, nombre: string): string {
    const ruta = path.join(carpeta, nombre);
    fs.writeFileSync(ruta, 'imagen');
    return ruta;
}

const mensajeDe = (resultado: { success: boolean; error?: { issues: { message: string }[] } }) =>
    resultado.success ? 'válido' : `Error: ${resultado.error!.issues[0].message}`;

async function main(): Promise<void> {
    let bien = 0;
    let mal = 0;
    const caso = async (id: number, nombre: string, esperada: string, prueba: () => Promise<string>) => {
        console.log(`\nID: ${id}\nNombre: ${nombre}\nSalida esperada: ${esperada}`);
        try {
            const obtenida = await prueba();
            comprobar(obtenida === esperada, `Se obtuvo "${obtenida}"`);
            bien++;
            console.log(`Salida obtenida: ${obtenida}\nBIEN: ${nombre}`);
        } catch (error) {
            mal++;
            console.error(`Salida obtenida: ${String(error)}\nMAL: ${nombre}`);
        }
    };

    await caso(1, 'Elegir un avatar de Syntra lo guarda como avatar:<id>', 'avatar:buho', async () => {
        const { persistencia, usuario } = persistenciaFalsa();
        const valor = await new ElegirAvatar(persistencia).ejecutar(1, 'buho');
        comprobar(usuario.foto === valor, 'No se guardó el avatar');
        return valor;
    });

    await caso(2, 'Elegir un avatar borra la foto subida antes', 'avatar:gato │ foto borrada', async () => {
        const foto = imagenDePrueba(carpetaTemporal(), '1.png');
        const { persistencia } = persistenciaFalsa(foto);
        const valor = await new ElegirAvatar(persistencia).ejecutar(1, 'gato');
        return `${valor} │ ${fs.existsSync(foto) ? 'foto sin borrar' : 'foto borrada'}`;
    });

    await caso(3, 'Elegir un avatar para un usuario que no existe', 'Error: El usuario no existe.', async () => {
        const { persistencia } = persistenciaFalsa(null, false);
        await esperarError(() => new ElegirAvatar(persistencia).ejecutar(99, 'buho'), 'El usuario no existe.');
        return 'Error: El usuario no existe.';
    });

    await caso(4, 'Rechazar un avatar con nombre inválido', 'Error: Avatar inválido.', async () =>
        mensajeDe(elegirAvatarSchema.safeParse({ id: 1, avatar: '../foto.png' })));

    await caso(5, 'Obtener la foto de perfil cuando es un avatar', 'avatar:cohete', async () => {
        const { persistencia } = persistenciaFalsa('avatar:cohete');
        return String(await new ObtenerFotoPerfil(persistencia).ejecutar(1));
    });

    await caso(6, 'Obtener la foto de perfil cuando es una imagen subida', 'data:image/png;base64,aW1hZ2Vu', async () => {
        const foto = imagenDePrueba(carpetaTemporal(), '1.png');
        const { persistencia } = persistenciaFalsa(foto);
        return String(await new ObtenerFotoPerfil(persistencia).ejecutar(1));
    });

    await caso(7, 'Sin foto ni avatar devuelve null', 'null', async () => {
        const { persistencia } = persistenciaFalsa();
        return String(await new ObtenerFotoPerfil(persistencia).ejecutar(1));
    });

    await caso(8, 'Subir una foto reemplaza el avatar elegido', '1.jpg │ data:image/jpeg', async () => {
        const carpeta = carpetaTemporal();
        const origen = imagenDePrueba(carpetaTemporal(), 'yo.jpg');
        const { persistencia, usuario } = persistenciaFalsa('avatar:buho');
        const dataUrl = await new ActualizarFotoPerfil(persistencia, carpeta).ejecutar(1, origen);
        comprobar(fs.existsSync(path.join(carpeta, '1.jpg')), 'No se copió la foto');
        return `${path.basename(usuario.foto ?? '')} │ ${String(dataUrl).split(';')[0]}`;
    });

    await caso(9, 'Rechazar una foto con formato no permitido', 'Error: La imagen debe ser PNG, JPG o WEBP.', async () => {
        const { persistencia, usuario } = persistenciaFalsa('avatar:buho');
        const origen = imagenDePrueba(carpetaTemporal(), 'animada.gif');
        await esperarError(() => new ActualizarFotoPerfil(persistencia, carpetaTemporal()).ejecutar(1, origen),
            'La imagen debe ser PNG, JPG o WEBP.');
        comprobar(usuario.foto === 'avatar:buho', 'Se cambió el avatar con una imagen inválida');
        return 'Error: La imagen debe ser PNG, JPG o WEBP.';
    });

    await caso(10, 'Elegir el color del avatar', 'color 3', async () => {
        const { persistencia, usuario } = persistenciaFalsa();
        await new ElegirColorAvatar(persistencia).ejecutar(1, 3);
        return `color ${usuario.color}`;
    });

    await caso(11, 'Volver al color automático', 'color null', async () => {
        const { persistencia, usuario } = persistenciaFalsa();
        usuario.color = 5;
        await new ElegirColorAvatar(persistencia).ejecutar(1, null);
        return `color ${usuario.color}`;
    });

    await caso(12, 'Rechazar un color fuera de la paleta (0 a 9)', 'rechazado', async () =>
        elegirColorAvatarSchema.safeParse({ id: 1, color: 10 }).success ? 'aceptado' : 'rechazado');

    await caso(13, 'Elegir color para un usuario que no existe', 'Error: El usuario no existe.', async () => {
        const { persistencia } = persistenciaFalsa(null, false);
        await esperarError(() => new ElegirColorAvatar(persistencia).ejecutar(99, 2), 'El usuario no existe.');
        return 'Error: El usuario no existe.';
    });

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal) process.exitCode = 1;
}

main().catch((error) => {
    console.error('MAL: Error al ejecutar las pruebas:', error);
    process.exitCode = 1;
});
