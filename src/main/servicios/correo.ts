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
        from: { name: 'Syntra', address: c.from },
    };
}

const escaparHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function enviarCodigoVerificacion(destinatario: string, codigo: string): Promise<void> {
    const { transporter, from } = crearTransporter();
    const codigoHtml = escaparHtml(codigo);
    await transporter.sendMail({
        from,
        to: destinatario,
        subject: 'Syntra | Código de verificación',
        text: `Tu código de verificación es: ${codigo}. Tiene una vigencia de 10 minutos.`,
        html: `
            <div style="margin:0;padding:32px 16px;background:#f3f6fb;font-family:Arial,sans-serif;color:#14233b">
                <div style="max-width:560px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #dce5f0;border-radius:16px">
                    <p style="margin:0 0 24px;color:#5277b8;font-size:14px;font-weight:700;letter-spacing:2px">SYNTRA</p>
                    <h1 style="margin:0 0 12px;font-size:24px">Código de verificación</h1>
                    <p style="margin:0 0 20px;line-height:1.6">Usá este código para continuar. Tiene una vigencia de 10 minutos.</p>
                    <p style="margin:0;padding:16px;border-radius:10px;background:#edf3fc;color:#243f70;text-align:center;font-size:30px;font-weight:700;letter-spacing:8px">${codigoHtml}</p>
                </div>
            </div>`,
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
    const listaHtml = contenidos
        .map((contenido) => `<li style="margin:0 0 10px;padding:12px 14px;border:1px solid #dce5f0;border-radius:10px;background:#f8faff;line-height:1.5">${escaparHtml(contenido)}</li>`)
        .join('');
    const resultado = await transporter.sendMail({
        from,
        to: destinatario,
        subject: 'Syntra | Recordatorio de repaso',
        text: [
            'Tenés contenido pendiente para repasar:',
            '',
            ...contenidos.map((contenido) => `• ${contenido}`),
            '',
            'Ingresá a Syntra para continuar tu sesión de estudio.',
        ].join('\n'),
        html: `
            <div style="margin:0;padding:32px 16px;background:#f3f6fb;font-family:Arial,sans-serif;color:#14233b">
                <div style="max-width:600px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #dce5f0;border-radius:16px">
                    <p style="margin:0 0 24px;color:#5277b8;font-size:14px;font-weight:700;letter-spacing:2px">SYNTRA</p>
                    <h1 style="margin:0 0 12px;font-size:24px">Tu próximo repaso te espera</h1>
                    <p style="margin:0 0 20px;line-height:1.6">Tenés contenido pendiente para repasar:</p>
                    <ul style="margin:0 0 24px;padding:0;list-style:none">${listaHtml}</ul>
                    <p style="margin:0;padding:16px;border-radius:10px;background:#edf3fc;color:#243f70;line-height:1.5">Abrí Syntra para continuar tu sesión de estudio.</p>
                </div>
            </div>`,
    });

    if (resultado.accepted.length === 0 || resultado.rejected.length > 0) {
        throw new Error('El servidor SMTP no aceptó el destinatario del recordatorio.');
    }
}