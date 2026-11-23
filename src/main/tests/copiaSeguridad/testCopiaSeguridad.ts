import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pool } from '../../persistencia/baseDeDatos';
import { Persistencia } from '../../persistencia/persistencia';
import { cifrarCopia, derivarClave, descifrarCopia, salNueva } from '../../logicaNoPersistente/copiaSeguridad/cifradoCopia';
import { armarPaquete, leerPaquete, rutaSegura } from '../../logicaNoPersistente/copiaSeguridad/paqueteCopia';
import { ClavesCopia } from '../../logicaNoPersistente/copiaSeguridad/clavesCopia';
import { ExportarBase } from '../../logicaPersistente/gestionDeCopiaSeguridad/exportarBase';
import { RestaurarBase } from '../../logicaPersistente/gestionDeCopiaSeguridad/restaurarBase';

// Tests de la copia de seguridad: cifrado, armado del paquete, clave guardada y restaurar la base.
// Los de la base exportan y vuelven a cargar TODO: correrlos solo en una base de prueba.
// Se corren con: npx tsx src/main/tests/copiaSeguridad/testCopiaSeguridad.ts

const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};

const errorDe = (accion: () => unknown): string => {
    try {
        accion();
        return 'sin error';
    } catch (e) {
        return (e as Error).message;
    }
};

// Cifrado de mentira para no depender de Electron: invierte el texto.
const cifradorFalso = {
    disponible: () => true,
    cifrar: (texto: string) => Buffer.from([...texto].reverse().join('')),
    descifrar: (datos: Buffer) => [...datos.toString()].reverse().join(''),
};

async function main(): Promise<void> {
    let bien = 0;
    let mal = 0;
    const caso = async (id: number, nombre: string, esperada: string, prueba: () => Promise<string> | string) => {
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

    const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'copia-'));
    const clave = derivarClave('Syntra2026', salNueva());
    const copia = cifrarCopia(Buffer.from('mis apuntes'), clave);

    await caso(1, 'Con la misma contraseña, la copia se abre igual', 'mis apuntes', () =>
        descifrarCopia(copia, 'Syntra2026').toString());

    await caso(2, 'Con otra contraseña, no se abre', 'La contraseña no es la de esta copia, o el archivo está dañado.', () =>
        errorDe(() => descifrarCopia(copia, 'otra')));

    await caso(3, 'Si alguien modifica el archivo, no se abre', 'La contraseña no es la de esta copia, o el archivo está dañado.', () => {
        const tocada = Buffer.from(copia);
        tocada[tocada.length - 1] ^= 1;
        return errorDe(() => descifrarCopia(tocada, 'Syntra2026'));
    });

    await caso(4, 'Un archivo que no es una copia de Syntra se rechaza', 'Este archivo no es una copia de seguridad de Syntra.', () =>
        errorDe(() => descifrarCopia(Buffer.from('hola, soy un PDF'), 'Syntra2026')));

    await caso(5, 'El paquete guarda las tablas y los archivos de las carpetas', 'usuarios: [{"id":1}] | archivos/sub/apunte.pdf', async () => {
        fs.mkdirSync(path.join(carpeta, 'archivos', 'sub'), { recursive: true });
        fs.writeFileSync(path.join(carpeta, 'archivos', 'sub', 'apunte.pdf'), 'PDF');
        const paquete = await armarPaquete({
            meta: { version: 1, fecha: '', appVersion: '1', carpetaDatos: carpeta, usuarios: 1 },
            tablas: { usuarios: '[{"id":1}]' },
        }, carpeta);
        const leido = await leerPaquete(paquete);
        return `usuarios: ${leido.tablas.usuarios} | ${leido.archivos.map((a) => `${a.carpeta}/${a.relativa}`).join(', ')}`;
    });

    await caso(6, 'Un archivo de la copia no puede escaparse de su carpeta', 'La copia tiene una ruta de archivo inválida.', () =>
        errorDe(() => rutaSegura(path.join(carpeta, 'archivos'), '../../secreto.txt')));

    await caso(7, 'La clave guardada sirve para abrir la copia con la contraseña', 'se guardó | se abre', () => {
        const claves = new ClavesCopia(carpeta, cifradorFalso, () => true);
        claves.guardar(5, 'Syntra2026');
        const guardada = claves.leer(5);
        const abre = guardada && descifrarCopia(cifrarCopia(Buffer.from('x'), guardada), 'Syntra2026').toString() === 'x';
        return `${guardada ? 'se guardó' : 'no se guardó'} | ${abre ? 'se abre' : 'no se abre'}`;
    });

    await caso(8, 'En un Linux sin llavero, la clave no se guarda', 'no se guardó', () => {
        const claves = new ClavesCopia(carpeta, cifradorFalso, () => false);
        claves.guardar(6, 'Syntra2026');
        return claves.leer(6) ? 'se guardó' : 'no se guardó';
    });

    const p = new Persistencia(pool);
    const cantidades = async () => {
        const filas = await p.ejecutar<{ tablename: string }>(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`);
        const partes: string[] = [];
        for (const { tablename } of filas) {
            const [{ n }] = await p.ejecutar<{ n: number }>(`SELECT count(*)::int AS n FROM "${tablename}"`);
            partes.push(`${tablename}=${n}`);
        }
        return partes.join(',');
    };

    try {
        const [{ id_usuario: usuarioId }] = await p.ejecutar<{ id_usuario: number }>(
            `INSERT INTO usuarios (nombre, apellido, apodo, email, password_hash, email_verificado, foto_perfil)
             VALUES ('Prueba', 'Copia', 'Prueba', 'copia' || floor(random() * 1e9) || '@syntra.test', 'x', TRUE, '/vieja/datos/fotosPerfil/yo.png')
             RETURNING id_usuario`);

        await caso(9, 'Restaurar en la misma base deja todo igual', 'igual', async () => {
            const antes = await cantidades();
            await new RestaurarBase(p).ejecutar(await new ExportarBase(p).ejecutar(), '', '');
            return (await cantidades()) === antes ? 'igual' : 'distinto';
        });

        await caso(10, 'Al restaurar en otra compu se corrigen las rutas de las fotos', '/nueva/datos/fotosPerfil/yo.png', async () => {
            await new RestaurarBase(p).ejecutar(await new ExportarBase(p).ejecutar(), '/vieja/datos', '/nueva/datos');
            const [fila] = await p.ejecutar(`SELECT foto_perfil FROM usuarios WHERE id_usuario = $1`, [usuarioId]);
            return fila.foto_perfil;
        });

        await caso(11, 'Después de restaurar, los ids nuevos siguen desde el último', 'id nuevo mayor', async () => {
            const [{ id_usuario: nuevo }] = await p.ejecutar<{ id_usuario: number }>(
                `INSERT INTO usuarios (nombre, apellido, apodo, email, password_hash, email_verificado)
                 VALUES ('Otra', 'Prueba', 'Otra', 'otra' || floor(random() * 1e9) || '@syntra.test', 'x', TRUE) RETURNING id_usuario`);
            await p.ejecutar(`DELETE FROM usuarios WHERE id_usuario = $1`, [nuevo]);
            return nuevo > usuarioId ? 'id nuevo mayor' : 'id repetido';
        });

        await p.ejecutar(`DELETE FROM usuarios WHERE id_usuario = $1`, [usuarioId]);
    } finally {
        fs.rmSync(carpeta, { recursive: true, force: true });
        await pool.end();
    }

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

main();
