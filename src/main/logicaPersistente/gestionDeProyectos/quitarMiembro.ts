import { QuitarMiembroDTOSchema, QuitarMiembroDTO } from './dto';
import { IPersistenciaProyectos, ISincronizador } from './interfacesSincronizacion';
import { exigirPermiso } from './permisos';
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

        if (!abandona) await exigirPermiso(this.persistencia, dto.idProyecto, dto.idUsuarioSolicitante!, 'miembro.quitar');

        const idRemoto = await idRemotoDe(this.persistencia, dto.idProyecto);
        await asegurarConexion(this.sincronizador);

        const objetivo = await buscarMiembroRemoto(this.sincronizador, idRemoto, mail);
        if (!objetivo || !objetivo.activo) throw new Error('El usuario no es miembro activo del proyecto');

        // Si es el propietario quien abandona, debemos transferir el rol antes de darlo de baja
        if (objetivo.rol === 'propietario') {
            const miembrosActivos = await this.persistencia.ejecutar<{ id_usuario: number; email: string; rol: string }>(
                `SELECT u.id_usuario, LOWER(u.email) AS email, pm.rol 
                 FROM proyecto_miembros pm 
                 JOIN usuarios u ON u.id_usuario = pm.id_usuario 
                 WHERE pm.id_proyecto = $1 AND pm.fecha_baja IS NULL AND LOWER(u.email) != $2`,
                [dto.idProyecto, mail]
            );

            if (miembrosActivos.length === 0) {
                throw new Error('El propietario no puede abandonar el proyecto siendo el único miembro activo.');
            }

            const sucesor = miembrosActivos.find(m => m.rol === 'editor') || miembrosActivos[0];

            // Actualizamos el rol en el servidor y en la base de datos local
            await this.sincronizador.gestionarMiembroPorMail(idRemoto, sucesor.email, 'alta', 'propietario');
            await this.persistencia.ejecutar(
                `UPDATE proyecto_miembros SET rol = 'propietario' WHERE id_proyecto = $1 AND id_usuario = $2`,
                [dto.idProyecto, sucesor.id_usuario]
            );
        }

        // Luego procedemos a dar de baja al miembro en el servidor
        await this.sincronizador.gestionarMiembroPorMail(idRemoto, mail, 'baja');

        // Actualizamos el estado en la base de datos local
        await this.persistencia.ejecutar(
            `UPDATE proyecto_miembros pm SET fecha_baja = NOW()
             FROM usuarios u
             WHERE u.id_usuario = pm.id_usuario AND pm.id_proyecto = $1 AND LOWER(u.email) = $2
               AND pm.fecha_baja IS NULL`,
            [dto.idProyecto, mail],
        );
    }
}