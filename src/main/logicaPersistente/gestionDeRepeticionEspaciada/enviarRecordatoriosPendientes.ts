import { Persistencia } from '../../persistencia/Persistencia';
import { enviarRecordatorioRepaso } from '../../servicios/correo';

interface ContenidoPendiente {
    id_usuario: number;
    email: string;
    tipo: 'Flashcard' | 'Material';
    titulo: string;
    detalle: string;
}

export class EnviarRecordatoriosPendientes {

    constructor(
        private readonly persistencia: Persistencia
    ) { }

    async ejecutar(): Promise<void> {

        const filas =
            await this.persistencia.ejecutar(
                `
                SELECT
                    u.id_usuario,
                    u.email,
                    'Flashcard' AS tipo,
                    d.nombre AS titulo,
                    f.pregunta AS detalle
                FROM flashcards f
                INNER JOIN decks d
                    ON d.id_deck = f.id_deck
                INNER JOIN usuarios u
                    ON u.id_usuario = d.id_usuario
                WHERE
                    u.email_verificado = TRUE
                    AND f.proxima_revision <= CURRENT_DATE
                    AND NOT EXISTS (
                        SELECT 1
                        FROM notificaciones_repaso_enviadas n
                        WHERE
                            n.id_usuario = u.id_usuario
                            AND n.fecha_envio = CURRENT_DATE
                    )

                UNION ALL

                SELECT
                    u.id_usuario,
                    u.email,
                    'Material' AS tipo,
                    n.nombre AS titulo,
                    '' AS detalle
                FROM repeticiones_material r
                INNER JOIN nodos n
                    ON n.id_nodo = r.id_nodo
                INNER JOIN usuarios u
                    ON u.id_usuario = r.id_usuario
                WHERE
                    u.email_verificado = TRUE
                    AND r.proxima_revision <= CURRENT_DATE
                    AND NOT EXISTS (
                        SELECT 1
                        FROM notificaciones_repaso_enviadas n
                        WHERE
                            n.id_usuario = u.id_usuario
                            AND n.fecha_envio = CURRENT_DATE
                    )

                ORDER BY
                    id_usuario,
                    tipo,
                    titulo
               `
            );

        const porUsuario =
            new Map<number,{email: string; contenidos: string[];}>();

        for (const fila of filas as ContenidoPendiente[]) {
            const grupo = porUsuario.get(fila.id_usuario) ??
                {email: fila.email,contenidos: []};

            grupo.contenidos.push(
                fila.tipo === 'Flashcard'
                    ? `${fila.titulo}: ${fila.detalle}`
                    : `${fila.titulo} (material)`
            );

            porUsuario.set(fila.id_usuario,grupo);
        }for (const [usuarioId,grupo] of porUsuario) {

            try {
                await enviarRecordatorioRepaso(
                    grupo.email,
                    grupo.contenidos
                );

                await this.persistencia.ejecutar(
                    `
                    INSERT INTO
                        notificaciones_repaso_enviadas
                    (
                        id_usuario,
                        fecha_envio
                    )
                    VALUES
                    (
                        $1,
                        CURRENT_DATE
                    )
                    ON CONFLICT
                    (
                        id_usuario,
                        fecha_envio
                    )
                    DO NOTHING
                    `,
                    [usuarioId]
                );

                console.info(
                    `[repeticion-espaciada] Recordatorio enviado al usuario ${usuarioId}`
                );

            } catch (error) {

                console.error(
                    `[repeticion-espaciada] No se pudo enviar el recordatorio del usuario ${usuarioId}`,
                    error
                );
            }
        }
    }
}