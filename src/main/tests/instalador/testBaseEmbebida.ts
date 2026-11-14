import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from 'pg';
import { levantarBase, type Conexion, type Servidor } from '../../persistencia/servidorBase';

// Prueba la base propia del instalador con un PostgreSQL real, en una carpeta temporal.
// Se corre con: npx tsx src/main/tests/instalador/testBaseEmbebida.ts

const CONEXION: Conexion = { host: 'localhost', port: 54339, user: 'syntra', password: 'syntra', database: 'syntra_test' };

const comprobar = (ok: boolean, mensaje: string): void => {
    if (!ok) throw new Error(mensaje);
};

async function consultar<T>(sql: string): Promise<T[]> {
    const cliente = new Client(CONEXION);
    await cliente.connect();
    try {
        return (await cliente.query(sql)).rows as T[];
    } finally {
        await cliente.end();
    }
}

async function main(): Promise<void> {
    const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'syntra-base-'));
    const datos = path.join(raiz, 'datos');
    const scripts = path.join(raiz, 'scripts');
    fs.mkdirSync(scripts);
    const script = (nombre: string, sql: string) => fs.writeFileSync(path.join(scripts, nombre), sql);
    let servidor: Servidor | null = null;

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

    try {
        await caso(1, 'La primera vez crea la base y corre todos los scripts en orden',
            '001_materias.sql, 002_notas.sql', async () => {
                script('002_notas.sql', 'CREATE TABLE notas (id SERIAL PRIMARY KEY, nota INT);');
                script('001_materias.sql', 'CREATE TABLE materias (id SERIAL PRIMARY KEY, nombre TEXT);');
                const r = await levantarBase(datos, scripts, CONEXION);
                servidor = r.servidor;
                return r.aplicados.join(', ');
            });

        await caso(2, 'Los datos quedan guardados al cerrar y volver a abrir',
            'Física I', async () => {
                await consultar("INSERT INTO materias (nombre) VALUES ('Física I')");
                await servidor?.stop();
                servidor = (await levantarBase(datos, scripts, CONEXION)).servidor;
                const filas = await consultar<{ nombre: string }>('SELECT nombre FROM materias');
                return filas.map((f) => f.nombre).join(', ');
            });

        await caso(3, 'Al volver a abrir no repite los scripts ya aplicados',
            '0 scripts nuevos | 2 anotados', async () => {
                await servidor?.stop();
                const r = await levantarBase(datos, scripts, CONEXION);
                servidor = r.servidor;
                const anotados = await consultar('SELECT nombre FROM scripts_aplicados');
                return `${r.aplicados.length} scripts nuevos | ${anotados.length} anotados`;
            });

        await caso(4, 'Un script nuevo (por ejemplo de una actualización) se aplica solo',
            '003_cuadernos.sql', async () => {
                script('003_cuadernos.sql', 'CREATE TABLE cuadernos (id SERIAL PRIMARY KEY);');
                await servidor?.stop();
                const r = await levantarBase(datos, scripts, CONEXION);
                servidor = r.servidor;
                return r.aplicados.join(', ');
            });

        await caso(5, 'Un script con error no queda a medias ni se anota',
            'Error: Falló el script 004_roto.sql | sin tabla roto | sin anotar', async () => {
                script('004_roto.sql', 'CREATE TABLE roto (id INT); SELECT * FROM tabla_que_no_existe;');
                await servidor?.stop();
                servidor = null;
                let error = '';
                try {
                    servidor = (await levantarBase(datos, scripts, CONEXION)).servidor;
                } catch (e) {
                    error = String(e).split(':').slice(0, 2).join(':');
                }
                fs.rmSync(path.join(scripts, '004_roto.sql'));
                servidor = (await levantarBase(datos, scripts, CONEXION)).servidor;
                const tabla = await consultar("SELECT 1 FROM pg_tables WHERE tablename = 'roto'");
                const anotado = await consultar("SELECT 1 FROM scripts_aplicados WHERE nombre = '004_roto.sql'");
                return `${error} | ${tabla.length ? 'con' : 'sin'} tabla roto | ${anotado.length ? 'anotado' : 'sin anotar'}`;
            });

        await caso(6, 'El instalador lleva el ícono de escritorio, los scripts y el .env',
            'Syntra | acceso directo | db/init y .env | sin asar', async () => {
                const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
                const b = pkg.build;
                const recursos = b.extraResources.map((r: { to: string }) => r.to).join(' y ');
                return [
                    b.productName,
                    b.nsis.createDesktopShortcut ? 'acceso directo' : 'sin acceso directo',
                    recursos,
                    b.asar === false ? 'sin asar' : 'con asar',
                ].join(' | ');
            });
    } finally {
        await (servidor as Servidor | null)?.stop().catch(() => undefined);
        fs.rmSync(raiz, { recursive: true, force: true });
    }

    console.log(`\nResultado: ${bien} BIEN, ${mal} MAL.`);
    if (mal > 0) process.exitCode = 1;
}

void main();
