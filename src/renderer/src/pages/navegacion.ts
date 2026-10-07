import {
  Home, Library, BookOpen, CalendarClock, List, Briefcase,
  CalendarDays, MessageCircle, Settings, LogOut,
  CircleHelp, Mail, Bell,
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
  { id: "calendario", etiqueta: "Calendario", icono: CalendarDays },
  { id: "chat", etiqueta: "Chat", icono: MessageCircle },
];

export const itemsInferiores: ItemNavegacion[] = [
  { id: "ajustes", etiqueta: "Ajustes", icono: Settings },
  { id: "cerrar-sesion", etiqueta: "Cerrar sesión", icono: LogOut },
];

export const accionesSuperiores: AccionSuperior[] = [
  { id: "ayuda", etiqueta: "Ayuda", icono: CircleHelp },
  { id: "mensajes", etiqueta: "Mensajes", icono: Mail },
  { id: "notificaciones", etiqueta: "Notificaciones", icono: Bell },
];