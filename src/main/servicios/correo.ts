import nodemailer from 'nodemailer';

function obtenerConfiguracionSMTP() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASS;
    const port = Number(process.env.SMTP_PORT) || 587;

    return {
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        auth: { user, pass: password },
        from: process.env.SMTP_FROM || user,
    };
}

function crearTransporter() {
    const c = obtenerConfiguracionSMTP();
    return {
        transporter: nodemailer.createTransport({
            host: c.host,
            port: c.port,
            secure: c.secure,
            auth: { user: c.auth.user, pass: c.auth.pass },
        }),
        from: c.from,
    };
}

const escaparHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function enviarCodigoVerificacion(destinatario: string, codigo: string): Promise<void> {
    const { transporter, from } = crearTransporter();
    await transporter.sendMail({
        from,
        to: destinatario,
        subject: 'Código de verificación',
        text: `Tu código de verificación es: ${codigo}. Tiene una vigencia de 10 minutos.`,
        html: `<p>Tu código de verificación es:</p><h2>${escaparHtml(codigo)}</h2><p>Tiene una vigencia de 10 minutos.</p>`,
    });
}
export async function enviarInvitacionProyecto(
    destinatario: string,
    nombreProyecto: string,
    nombreInvitador: string,
    enlace: string,
): Promise<void> {
    const { transporter, from } = crearTransporter();
    await transporter.sendMail({
        from,
        to: destinatario,
        subject: `Invitación al proyecto "${nombreProyecto}"`,
        text:
            `${nombreInvitador} te invitó al proyecto "${nombreProyecto}".\n` +
            `Para unirte, iniciá sesión en la aplicación con este mismo mail (${destinatario}), ` +
            `andá a Proyectos > "Unirme con enlace" y pegá:\n${enlace}`,
        html:
            `<p><strong>${escaparHtml(nombreInvitador)}</strong> te invitó al proyecto ` +
            `<strong>${escaparHtml(nombreProyecto)}</strong>.</p>` +
            `<p>Iniciá sesión en la aplicación con este mismo mail (<strong>${escaparHtml(destinatario)}</strong>), ` +
            `andá a <em>Proyectos &gt; Unirme con enlace</em> y pegá:</p>` +
            `<p style="font-family:monospace;font-size:14px">${escaparHtml(enlace)}</p>`,
    });
}

export async function enviarRecordatorioRepaso(destinatario: string, contenidos: string[]): Promise<void> {
    const { transporter, from } = crearTransporter();
    const resultado = await transporter.sendMail({
        from,
        to: destinatario,
        subject: 'Recordatorio de repaso',
        text: [
            'Tenés contenido pendiente para repasar:',
            '',
            ...contenidos.map((contenido) => `• ${contenido}`),
            '',
            'Ingresá a Syntra para continuar tu sesión de estudio.',
        ].join('\n'),
    });

    if (resultado.accepted.length === 0 || resultado.rejected.length > 0) {
        throw new Error('El servidor SMTP no aceptó el destinatario del recordatorio.');
    }
}