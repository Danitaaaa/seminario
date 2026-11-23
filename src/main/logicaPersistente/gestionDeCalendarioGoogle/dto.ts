import { z } from 'zod';

// Validación de lo que manda la pantalla de Google Calendar.
export const configurarCalendarioSchema = z.object({
  traerCambios: z.boolean(),
});

export const elegirCalendariosSchema = z.object({
  ids: z.array(z.string().min(1).max(300)).max(20),
});

const DOS_MESES_MS = 62 * 86_400_000;

// Un mes del calendario (con un poco de margen): no se piden años enteros a Google.
export const eventosOtrosSchema = z
  .object({
    desde: z.coerce.date(),
    hasta: z.coerce.date(),
  })
  .refine((d) => d.hasta > d.desde && d.hasta.getTime() - d.desde.getTime() <= DOS_MESES_MS, {
    message: 'El rango de fechas no es válido.',
  });

export const abrirEventoGoogleSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{20}$/),
});
