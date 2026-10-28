import { QuitarMiembroDTOSchema, QuitarMiembroDTO } from './dto';
import { IPersistenciaProyectos, ISincronizador } from './interfacesSincronizacion';
import { exigirRol } from './permisos';
import { asegurarConexion, buscarMiembroRemoto, idRemotoDe, mailDelMiembro } from './miembrosRemotos';

export class QuitarMiembro {
    constructor(private persistencia: IPersistenciaProyectos, private sincronizador: ISincronizador) {}

    async ejecutar(entrada: QuitarMiembroDTO): Promise<void> {
        const dto = QuitarMiembroDTOSchema.parse(entrada);

        const yo = await this.persistencia.ejecutar<{ email: string }>(
            `SELECT LOWER(email) AS email FROM usuarios WHERE id_usuario = $1`, [dto.idUsuarioSolicitante]);
        if (!yo[0]) throw new Error('Usuario inexistente');
        const mail = await mailDelMiembro(this.persistencia, dto);
        const abandona = mail === yo[0].email;

        if (!abandona) await exigirRol(this.persistencia, dto.idProyecto, dto.idUsuarioSolicitante, ['propietario']);

        const idRemoto = await idRemotoDe(this.persistencia, dto.idProyecto);
        await asegurarConexion(this.sincronizador);

        const objetivo = await buscarMiembroRemoto(this.sincronizador, idRemoto, mail);
        if (!objetivo || !objetivo.activo) throw new Error('El usuario no es miembro activo del proyecto');
        if (objetivo.rol === 'propietario') throw new Error('El propietario no puede darse de baja del proyecto');

        // Primero el servidor: si falla, no cambia nada. Sin conexión no se puede quitar a nadie,
        // porque la baja local dejaría el acceso abierto en el servidor.
        await this.sincronizador.gestionarMiembroPorMail(idRemoto, mail, 'baja');

        // Espejo local (existe, por ejemplo, en la PC de quien abandona el proyecto).
        // No se registra en la cola de cambios: tras la baja el servidor rechazaría ese envío (SIN_PERMISO).
        await this.persistencia.ejecutar(
            `UPDATE proyecto_miembros pm SET fecha_baja = NOW()
             FROM usuarios u
             WHERE u.id_usuario = pm.id_usuario AND pm.id_proyecto = $1 AND LOWER(u.email) = $2
               AND pm.fecha_baja IS NULL`,
            [dto.idProyecto, mail],
        );
    }
}