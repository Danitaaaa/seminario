import { useEffect, useState } from "react";
import {
  BookOpen, CalendarClock, CalendarDays, Timer, Briefcase, ScanFace, ExternalLink, Mail, X,
  type LucideIcon,
} from "lucide-react";
import "../../styles/ayuda.css";

interface PanelAyudaProps {
  onCerrar: () => void;
}

type Enlace = "github-dana";

interface Funcion {
  icono: LucideIcon;
  titulo: string;
  texto: string;
}

interface Integrante {
  nombre: string;
  iniciales: string;
  rol: string;
  frase?: string;
  github?: Enlace;
}

const FUNCIONES: Funcion[] = [
  { icono: BookOpen, titulo: "Material", texto: "Subí, organizá y editá tus apuntes en carpetas." },
  { icono: CalendarClock, titulo: "Horarios", texto: "Armá tu grilla semanal de cursado." },
  { icono: CalendarDays, titulo: "Calendario", texto: "Cargá exámenes y entregas con recordatorios." },
  { icono: Timer, titulo: "Sesiones", texto: "Estudiá con foco y seguí tu progreso." },
  { icono: Briefcase, titulo: "Proyectos", texto: "Organizá tus trabajos prácticos." },
  { icono: ScanFace, titulo: "Acceso facial", texto: "Iniciá sesión con tu rostro." },
];

const INTEGRANTES: Integrante[] = [
  { nombre: "Dana Diez Gomez", iniciales: "DDG", rol: "Desarrolladora full stack · Diseño e integración", frase: "Si no está en el calendario, no existe", github: "github-dana" },
  { nombre: "Carolina Magagnini", iniciales: "CM", rol: "Desarrolladora full stack · Material de estudio" },
  { nombre: "Alba Heredia", iniciales: "AH", rol: "Desarrolladora full stack · Usuarios y acceso facial" },
  { nombre: "Ludmila Peretti", iniciales: "LP", rol: "Desarrolladora full stack · Horarios y eventos" },
];

const abrir = (enlace: Enlace) => window.api.abrirEnlace({ enlace }).catch(console.error);

// Cartel del ícono de ayuda: qué es Syntra y quiénes la hicimos.
export function PanelAyuda({ onCerrar }: PanelAyudaProps) {
  const [copiado, setCopiado] = useState(false);

  const copiarCorreo = () =>
    navigator.clipboard.writeText("babineo.utn15@gmail.com").then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [onCerrar]);

  return (
    <div className="ayuda-overlay" onClick={onCerrar}>
      <div className="ayuda" role="dialog" aria-modal="true" aria-labelledby="ayuda-titulo" onClick={(e) => e.stopPropagation()}>
        <header className="ayuda__cabecera">
          <div className="ayuda__logo" aria-hidden="true">S</div>
          <div className="ayuda__marca">
            <h2 id="ayuda-titulo" className="ayuda__nombre">Syntra</h2>
            <p className="ayuda__lema">Tu espacio de estudio, en un solo lugar</p>
          </div>
          <button type="button" className="ayuda__cerrar" onClick={onCerrar} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>

        <div className="ayuda__cuerpo">
          <section>
            <h3 className="ayuda__titulo">¿Qué es Syntra?</h3>
            <p className="ayuda__texto">
              Syntra es una aplicación de escritorio pensada para estudiantes. Reúne tu material de estudio,
              tus horarios de cursado, tus eventos y tus sesiones de estudio, para que dejes de saltar entre
              carpetas, agendas y aplicaciones.
            </p>
            <p className="ayuda__texto">
              El nombre une <em>sinapsis</em> y <em>transformación</em>: la conexión que se forma cada vez que
              aprendés algo nuevo, y el cambio que eso produce en vos.
            </p>
          </section>

          <section>
            <h3 className="ayuda__titulo">¿Qué podés hacer?</h3>
            <div className="ayuda__funciones">
              {FUNCIONES.map(({ icono: Icono, titulo, texto }) => (
                <div key={titulo} className="ayuda__funcion">
                  <p className="ayuda__funcion-titulo"><Icono size={16} aria-hidden="true" /> {titulo}</p>
                  <p className="ayuda__funcion-texto">{texto}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="ayuda__titulo">Sobre nosotras</h3>
            <p className="ayuda__texto">
              Somos cuatro estudiantes de Ingeniería en Sistemas de Información de la UTN Facultad Regional
              Villa María. Syntra nació como nuestro proyecto para la materia Seminario, a partir de algo que
              nos pasaba a todas: tener el estudio desparramado en mil lugares.
            </p>
            <div className="ayuda__equipo">
              {INTEGRANTES.map((i) => (
                <div key={i.nombre} className="ayuda__integrante">
                  <div className="ayuda__avatar" aria-hidden="true">{i.iniciales}</div>
                  <div className="ayuda__datos">
                    <p className="ayuda__integrante-nombre">{i.nombre}</p>
                    <p className="ayuda__rol">{i.rol}</p>
                    {i.frase && <p className="ayuda__frase">"{i.frase}"</p>}
                    {i.github && (
                      <button type="button" className="ayuda__enlace" onClick={() => abrir(i.github!)}>
                        <ExternalLink size={12} aria-hidden="true" /> GitHub
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="ayuda__pie">
          <button type="button" className="ayuda__enlace" onClick={copiarCorreo}>
            <Mail size={12} aria-hidden="true" /> {copiado ? "¡Correo copiado!" : "babineo.utn15@gmail.com"}
          </button>
          <span>Versión 1.0 · 2026</span>
        </footer>
      </div>
    </div>
  );
}