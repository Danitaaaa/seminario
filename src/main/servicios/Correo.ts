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

export async function enviarCodigoVerificacion(
    destinatario: string,
    codigo: string
): Promise<void> {
    const configuracion = obtenerConfiguracionSMTP();
    const transporter = nodemailer.createTransport({
        host: configuracion.host,
        port: configuracion.port,
        secure: configuracion.secure,
        auth: {
            user: configuracion.auth.user,
            pass: configuracion.auth.pass,
        },
    });

    await transporter.sendMail({
        from: configuracion.from,
        to: destinatario,
        subject: 'Código de verificación',
        text: `Tu código de verificación es: ${codigo}. Tiene una vigencia de 10 minutos.`,
        html: `<p>Tu código de verificación es:</p><h2>${codigo}</h2><p>Tiene una vigencia de 10 minutos.</p>`,
    });
}
