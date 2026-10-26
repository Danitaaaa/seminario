import {
  Home, Library, BookOpen, CalendarClock, List, Briefcase, CalendarRange,
  CalendarDays, MessageCircle, Settings, LogOut,
  CircleHelp,
} from "lucide-react";
import type { AccionSuperior, ItemNavegacion } from '../types/layout';

// Para agregar una sección al menú solo se agrega una línea acá
export const itemsPrincipales: ItemNavegacion[] = [
  { id: "inicio", etiqueta: "Inicio", icono: Home },
  { id: "material", etiqueta: "Material", icono: Library },
  { id: "sesiones", etiqueta: "Sesiones de estudio", icono: BookOpen },
  { id: "horarios", etiqueta: "Horarios", icono: CalendarClock },
  { id: "metodos", etiqueta: "Métodos", icono: List },
  { id: "proyectos", etiqueta: "Proyectos", icono: Briefcase },
  { id: "cronograma", etiqueta: "Cronograma", icono: CalendarRange },
  { id: "calendario", etiqueta: "Calendario", icono: CalendarDays },
  { id: "chat", etiqueta: "Chat", icono: MessageCircle },
];

export const itemsInferiores: ItemNavegacion[] = [
  { id: "ajustes", etiqueta: "Ajustes", icono: Settings },
  { id: "cerrar-sesion", etiqueta: "Cerrar sesión", icono: LogOut },
];

export const accionesSuperiores: AccionSuperior[] = [
  { id: "ayuda", etiqueta: "Ayuda", icono: CircleHelp },
];

// A qué ruta lleva cada ítem de la barra lateral.
const rutasPorItem: Record<string, string> = {
  inicio: '/dashboard',
  material: '/material',
  horarios: '/horarios',
  cronograma: '/cronograma',
  calendario: '/eventos',
  perfil: '/perfil',
  metodos: '/metodos',
  'cerrar-sesion': '/',
  ajustes: '/ajustes',
};

// Los ítems que todavía no tienen pantalla van a "Próximamente".
export const rutaDe = (id: string) => rutasPorItem[id] ?? `/proximamente/${id}`;