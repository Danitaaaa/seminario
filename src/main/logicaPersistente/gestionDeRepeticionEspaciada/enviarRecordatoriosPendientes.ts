import { Persistencia } from '../../persistencia/Persistencia';
import { enviarRecordatorioRepaso } from '../../servicios/correo';

interface ContenidoPendiente {
    id_usuario: number;
    email: string;
    tipo: 'Flashcard' | 'Material';
    titulo: string;
    detalle: string;
}

// Agrupa contenido vencido y limita los recordatorios a uno cada 24 horas por usuario.
export class EnviarRecordatoriosPendientes {

    constructor(
        private readonly persistencia: Persistencia
    ) { }

    async ejecutar(): Promise<void> {

        // Busca contenido vencido solo de usuarios verificados sin envío en las últimas 24 horas.
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
                            AND n.enviado_en > CURRENT_TIMESTAMP - INTERVAL '24 hours'
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
                            AND n.enviado_en > CURRENT_TIMESTAMP - INTERVAL '24 hours'
                    )

                ORDER BY
                    id_usuario,
                    tipo,
                    titulo
               `
            );

        const porUsuario =
            new Map<number,{email: string; contenidos: string[];}>();

        // Prepara un único correo con todos los repasos pendientes de cada cuenta.
        for (const fila of filas as ContenidoPendiente[]) {
            const grupo = porUsuario.get(fila.id_usuario) ??
                {email: fila.email,contenidos: []};

            grupo.contenidos.push(
                fila.tipo === 'Flashcard'
                    ? `${fila.titulo}: ${fila.detalle}`
                    : `${fila.titulo} (material)`
            );

            porUsuario.set(fila.id_usuario,grupo);
        }

        // Registra el momento de envío únicamente después de que SMTP lo acepta.
        for (const [usuarioId,grupo] of porUsuario) {

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
                        fecha_envio,
                        enviado_en
                    )
                    VALUES
                    (
                        $1,
                        CURRENT_DATE,
                        CURRENT_TIMESTAMP
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