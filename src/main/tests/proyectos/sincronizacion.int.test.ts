import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { SincronizadorSupabase, ProveedorIdentidad } from '../../logicaPersistente/gestionDeProyectos/sincronizadorSupabase';

// Apuntamos a la nube usando las variables de entorno de tu proyecto
const SUPABASE_URL = process.env.MAIN_VITE_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = process.env.MAIN_VITE_SUPABASE_ANON_KEY || 'tu-anon-key-de-supabase';

// Helper para crear un proveedor de identidad de prueba compatible con SincronizadorSupabase
function crearProveedorTest(mail: string, nombre: string): ProveedorIdentidad {
    return {
        async credenciales() {
            // Contraseña fija para usuarios de prueba en la nube
            return { mail, password: 'TestPassword123!', nombre };
        },
        confirmar(mailConfirmado) {
            console.log(`[Test] Credenciales confirmadas para: ${mailConfirmado}`);
        }
    };
}

// Helper para instanciar el SincronizadorSupabase conectado a la nube
function crearClienteCloud(mail: string, nombre: string, idCliente: string) {
    const proveedor = crearProveedorTest(mail, nombre);
    const mailDe = async (id: number) => `usuario${id}@test.com`;

    return new SincronizadorSupabase(
        {
            url: SUPABASE_URL,
            anonKey: SUPABASE_ANON_KEY,
            idCliente,
        },
        proveedor,
        mailDe
    );
}

describe('Integración Cloud: Sincronización, Bloqueos y Miembros', () => {
    let syncPropietario: SincronizadorSupabase;
    let syncEditor: SincronizadorSupabase;

    const emailProp = `prop_${Date.now()}@test.com`;
    const emailEditor = `editor_${Date.now()}@test.com`;

    beforeEach(async () => {
        // Inicializamos los clientes para dos usuarios distintos en la nube
        syncPropietario = crearClienteCloud(emailProp, 'Propietario Test', 'cliente-prop-cloud');
        syncEditor = crearClienteCloud(emailEditor, 'Editor Test', 'cliente-editor-cloud');

        // Conectamos (esto ejecutará el signUp/signIn automático en tu Supabase cloud)
        await syncPropietario.conectar();
        await syncEditor.conectar();
    });

    afterEach(async () => {
        await syncPropietario.desconectar().catch(() => {});
        await syncEditor.desconectar().catch(() => {});
    });

    it('1. Publicación de proyecto en la nube y resolución de invitación', async () => {
        // El propietario publica un proyecto en Supabase Cloud
        const remoto = await syncPropietario.publicarProyecto(1, 'Proyecto Cloud Test');
        expect(remoto.idRemoto).toBeDefined();
        expect(remoto.enlace).toContain('proyecto-sync://unirse/');

        // El propietario invita al editor por mail utilizando la función RPC 'gestionar_miembro'
        await syncPropietario.gestionarMiembroPorMail(remoto.idRemoto, emailEditor, 'alta', 'editor');

        // El editor resuelve el enlace de invitación en la nube
        const invitacion = await syncEditor.resolverEnlace(remoto.enlace);
        expect(invitacion.idRemoto).toBe(remoto.idRemoto);
        expect(invitacion.rol).toBe('editor');

        // Verificamos que aparezca listado correctamente mediante la función RPC 'listar_miembros'
        const miembros = await syncEditor.listarMiembrosRemotos(remoto.idRemoto);
        const miembroEditor = miembros.find(m => m.mail === emailEditor.toLowerCase());
        
        expect(miembroEditor).toBeDefined();
        expect(miembroEditor?.activo).toBe(true);
        expect(miembroEditor?.rol).toBe('editor');
    });

    it('2. Bloqueo exclusivo atómico en la nube (Adquirir y Ocupado)', async () => {
        const remoto = await syncPropietario.publicarProyecto(1, 'Proyecto Bloqueos Cloud');
        const claveGlobal = { entidad: 'archivo' as const, idGlobal: '33333333-3333-4333-8333-333333333333' };

        // ¡Importante!: Dar de alta al editor en el proyecto y que acepte la invitación para tener permisos
        await syncPropietario.gestionarMiembroPorMail(remoto.idRemoto, emailEditor, 'alta', 'editor');
        await syncEditor.resolverEnlace(remoto.enlace);

        // El propietario adquiere el bloqueo en la nube
        const bloqueoProp = await syncPropietario.adquirirBloqueo(remoto.idRemoto, claveGlobal);
        expect(bloqueoProp.concedido).toBe(true);

        // El editor intenta tomar el mismo bloqueo de forma concurrente
        const bloqueoEditor = await syncEditor.adquirirBloqueo(remoto.idRemoto, claveGlobal);
        expect(bloqueoEditor.concedido).toBe(false);
        expect(bloqueoEditor.titular?.mail).toBe(emailProp.toLowerCase());

        // El propietario libera el bloqueo
        await syncPropietario.liberarBloqueo(remoto.idRemoto, claveGlobal);

        // Ahora el editor debería poder adquirirlo sin problemas
        const bloqueoEditorDespues = await syncEditor.adquirirBloqueo(remoto.idRemoto, claveGlobal);
        expect(bloqueoEditorDespues.concedido).toBe(true);
    });
    it('3. Envío y recepción de cambios remotos en la nube', async () => {
        const remoto = await syncPropietario.publicarProyecto(1, 'Proyecto Cambios Cloud');

        // Preparamos un cambio local simulado para enviar a la tabla 'cambios_remotos'
        const cambios = [{
            id: 1,
            idProyecto: 1,
            entidad: 'tarea' as const,
            idEntidad: 50,
            operacion: 'crear' as const,
            payload: { idGlobal: '44444444-4444-4444-8444-444444444444', datos: { titulo: 'Tarea en la nube' } },
            fechaCambio: new Date(),
            fechaEnvio: null
        }];

        // El propietario envía los cambios a la nube
        const versionServidor = await syncPropietario.enviarCambios(remoto.idRemoto, cambios);
        expect(versionServidor).toBeGreaterThan(0);

        // El editor da de alta al editor en el proyecto para tener permisos de lectura de cambios vía RLS
        await syncPropietario.gestionarMiembroPorMail(remoto.idRemoto, emailEditor, 'alta', 'editor');
        await syncEditor.resolverEnlace(remoto.enlace);

        // El editor consulta los cambios recibidos desde la versión 0
        const resultadoRecibidos = await syncEditor.recibirCambios(remoto.idRemoto, 0);
        expect(resultadoRecibidos.cambios.length).toBeGreaterThanOrEqual(1);
        expect(resultadoRecibidos.versionServidor).toBe(versionServidor);
    });
});