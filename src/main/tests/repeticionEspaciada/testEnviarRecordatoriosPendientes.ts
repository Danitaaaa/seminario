import nodemailer from 'nodemailer';
import { terminar, verificar } from '../materialEstudio/entornoTest';
import type { Persistencia } from '../../persistencia/Persistencia';

// Forma mínima que devuelve la consulta de contenido pendiente.
interface FilaPendiente {
  id_usuario: number;
  email: string;
  tipo: 'Flashcard' | 'Material';
  titulo: string;
  detalle: string;
}

// Simula la consulta de pendientes y la escritura del envío diario.
function crearPersistenciaFalsa(responder: (sql: string, valores: unknown[]) => Promise<any[]> = async () => []) {
  const consultas: { sql: string; valores: unknown[] }[] = [];
  const ejecutar = async (sql: string, valores: unknown[] = []) => {
    consultas.push({ sql, valores });
    return responder(sql, valores);
  };
  return { consultas, persistencia: { ejecutar } as unknown as Persistencia };
}

async function main(): Promise<void> {
  // Incluye más de un contenido para un usuario y otro usuario independiente.
  const pendientes: FilaPendiente[] = [
    { id_usuario: 7, email: 'alba@example.test', tipo: 'Flashcard', titulo: 'Bases de datos', detalle: '¿Qué es una base de datos?' },
    { id_usuario: 7, email: 'alba@example.test', tipo: 'Material', titulo: 'Unidad 2', detalle: '' },
    { id_usuario: 8, email: 'otro@example.test', tipo: 'Flashcard', titulo: 'Diseño', detalle: '¿Qué es un caso de uso?' },
  ];
  const { consultas, persistencia } = crearPersistenciaFalsa(async (sql) =>
    sql.includes('INSERT INTO') ? [] : pendientes);

  // Sustituye SMTP para observar destinatarios y contenido sin enviar correos reales.
  const transporteOriginal = nodemailer.createTransport;
  const correosEnviados: { destinatario: string; contenido: string }[] = [];
  nodemailer.createTransport = (() => ({
    sendMail: async (mensaje: { to: string; text: string }) => {
      correosEnviados.push({ destinatario: mensaje.to, contenido: mensaje.text });
      return { accepted: [mensaje.to], rejected: [] };
    },
  })) as unknown as typeof nodemailer.createTransport;

  try {
    const { EnviarRecordatoriosPendientes } = await import(
      '../../logicaPersistente/gestionDeRepeticionEspaciada/enviarRecordatoriosPendientes'
    );
    await new EnviarRecordatoriosPendientes(persistencia).ejecutar();
  } finally {
    nodemailer.createTransport = transporteOriginal;
  }

  const consultaPendientes = consultas[0].sql;
  // Comprueba las reglas de vencimiento, verificación, agrupación y registro diario.
  verificar('Buscar flashcards y material vencido',
    /UNION ALL/i.test(consultaPendientes) &&
      (consultaPendientes.match(/proxima_revision\s*<=\s*CURRENT_DATE/gi) ?? []).length === 2);
  verificar('Excluir usuarios sin email verificado',
    (consultaPendientes.match(/email_verificado\s*=\s*TRUE/gi) ?? []).length === 2);
  verificar('Enviar un único correo agrupado por usuario',
    correosEnviados.length === 2 &&
      correosEnviados[0].destinatario === 'alba@example.test' &&
      correosEnviados[0].contenido.includes('Bases de datos: ¿Qué es una base de datos?') &&
      correosEnviados[0].contenido.includes('Unidad 2 (material)'));
  verificar('Registrar fecha y hora de cada envío aceptado',
    consultas.filter(({ sql }) => /INSERT INTO\s+notificaciones_repaso_enviadas/i.test(sql)).length === 2 &&
      consultas.filter(({ sql }) => /INSERT INTO\s+notificaciones_repaso_enviadas/i.test(sql))
        .every(({ sql }) => /fecha_envio,\s*enviado_en/i.test(sql) &&
          /CURRENT_DATE,\s*CURRENT_TIMESTAMP/i.test(sql)) &&
      JSON.stringify(consultas.filter(({ sql }) => /INSERT INTO\s+notificaciones_repaso_enviadas/i.test(sql))
        .map(({ valores }) => valores[0])) === JSON.stringify([7, 8]));
  verificar('Bloquear otro recordatorio durante las 24 horas posteriores al envío',
    (consultaPendientes.match(/n\.enviado_en\s*>\s*CURRENT_TIMESTAMP\s*-\s*INTERVAL\s+'24 hours'/gi) ?? []).length === 2 &&
      consultas.some(({ sql }) => /ON CONFLICT\s*\(\s*id_usuario,\s*fecha_envio\s*\)\s*DO NOTHING/i.test(sql)));

  const { consultas: consultasSinVencidos, persistencia: sinVencidos } =
    crearPersistenciaFalsa();
  nodemailer.createTransport = (() => {
    throw new Error('No debe inicializarse el transporte si no hay vencimientos.');
  }) as typeof nodemailer.createTransport;
  try {
    const { EnviarRecordatoriosPendientes } = await import(
      '../../logicaPersistente/gestionDeRepeticionEspaciada/enviarRecordatoriosPendientes'
    );
    await new EnviarRecordatoriosPendientes(sinVencidos).ejecutar();
  } finally {
    nodemailer.createTransport = transporteOriginal;
  }
  verificar('Sin contenido vencido no enviar ni registrar correo',
    consultasSinVencidos.length === 1 &&
      !consultasSinVencidos.some(({ sql }) => /INSERT INTO\s+notificaciones_repaso_enviadas/i.test(sql)));
}

main().then(terminar).catch((error) => {
  console.error('FALLO: Error al ejecutar las pruebas:', error);
  process.exitCode = 1;
});
