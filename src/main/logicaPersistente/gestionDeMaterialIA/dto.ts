import { z } from 'zod';
import { TIPOS_MATERIAL_IA } from '../../logicaNoPersistente/ia/tipos';

// Pedir a la IA un resumen, cuestionario o mapa mental de un archivo de Material.
export const generarMaterialIASchema = z.object({
  trabajoId: z.uuid({ error: 'Identificador de trabajo inválido.' }),
  idArchivo: z.number().int().positive(),
  tipo: z.enum(TIPOS_MATERIAL_IA, { error: 'Tipo de material inválido.' }),
  // Indicaciones del usuario para la IA ("nivel parcial", "más corto"...). Opcional.
  preferencias: z.string().trim().max(2000, { error: 'Las indicaciones no pueden superar los 2000 caracteres.' }).optional(),
});

export type GenerarMaterialIADTO = z.infer<typeof generarMaterialIASchema>;

// Descartar una propuesta sin guardarla. (Cancelar usa 'ia:cancelar', el de toda la IA.)
export const trabajoIASchema = z.object({
  trabajoId: z.uuid({ error: 'Identificador de trabajo inválido.' }),
});

export type TrabajoIADTO = z.infer<typeof trabajoIASchema>;

// Confirmar la propuesta revisada. El contenido se valida con el esquema del tipo
export const guardarMaterialIASchema = z.object({
  trabajoId: z.uuid({ error: 'Identificador de trabajo inválido.' }),
  contenido: z.unknown(),
});

export type GuardarMaterialIADTO = z.infer<typeof guardarMaterialIASchema>;

export const listarMaterialesIASchema = z.object({
  idArchivo: z.number().int().positive().optional(),
  tipo: z.enum(TIPOS_MATERIAL_IA, { error: 'Tipo de material inválido.' }).optional(),
});

export type ListarMaterialesIADTO = z.infer<typeof listarMaterialesIASchema>;

// Abrir, eliminar o ver el historial de un material guardado.
export const materialIASchema = z.object({
  idMaterialIA: z.number().int().positive(),
});

export type MaterialIADTO = z.infer<typeof materialIASchema>;

// Respuestas al resolver un cuestionario: índice de la opción, texto escrito o null (en blanco).
export const responderCuestionarioSchema = z.object({
  idMaterialIA: z.number().int().positive(),
  respuestas: z.array(z.union([
    z.number().int().min(0),
    z.string().max(200, { error: 'Una respuesta es demasiado larga.' }),
    z.null(),
  ])).max(200),
});

export type ResponderCuestionarioDTO = z.infer<typeof responderCuestionarioSchema>;

// Guardar un mapa mental editado. El contenido se valida con el esquema del mapa en el caso de uso.
export const editarMapaMentalIASchema = z.object({
  idMaterialIA: z.number().int().positive(),
  contenido: z.unknown(),
});

export type EditarMapaMentalIADTO = z.infer<typeof editarMapaMentalIASchema>;
