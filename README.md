<p align="center">
  <img src="docs/banner.png" alt="Syntra" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-45-495B7D?logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/React-18-23354D?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-495B7D?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-18-23354D?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/UTN-FRVM-02122F" alt="UTN FRVM">
</p>

<p align="center"><i>Tu material de estudio, organizado en un solo lugar.</i></p>

---

## <img src="docs/iconos-syntra/descripcion.svg" height="30" align="middle"> Descripción

**Syntra** (sinapsis + transformación) es una aplicación de escritorio para organizar el estudio universitario: material, materias, sesiones de estudio, métodos para repasar, calendario y trabajo en grupo, todo en un mismo lugar. El inicio de sesión se hace por **reconocimiento facial**, tiene **inteligencia artificial** integrada que conoce tu agenda y tu material, y se puede usar **completamente por voz**, pensada también para personas con discapacidad visual.

## <img src="docs/iconos-syntra/funcionalidades.svg" height="30" align="middle"> Funcionalidades

### Estudio
- **Material de estudio:** carpetas y archivos, búsqueda, visor y editor de PDF, Word, Excel, imágenes y texto. Se pueden crear documentos de Word o de texto desde la app, descargar uno o varios archivos y conectar con Google Drive.
- **Notas rápidas:** post-its en cada carpeta, en tonos de la paleta elegida, que se arrastran a cualquier lugar de la pantalla.
- **Materias y formaciones:** carreras, cursos o academias con sus materias, años, cuatrimestres, estados y correlativas. El plan de estudios se carga desde un PDF, un Word o una foto.
- **Cuadernos:** uno por materia, con las notas de parciales, trabajos y finales, el promedio y todo el material, mazos, cuestionarios, mapas mentales y resúmenes de esa materia.
- **Sesiones de estudio:** objetivos, documento con pestañas e imágenes (se recortan, alinean y cambian de tamaño), temporizador Pomodoro, práctica activa y música de Spotify. El documento se guarda también como Word.
- **Métodos de estudio:** flashcards con repetición espaciada, cuestionarios, mapas mentales, resúmenes y guías de preguntas.
- **Corrector ortográfico** con sugerencias en el clic derecho.

### Inteligencia artificial
- **Chat con IA** que conoce tu agenda y tu material: responde qué tenés esta semana y te aconseja cómo organizarte para un parcial, en qué días, hasta qué tema y con qué métodos de Syntra. Acepta archivos adjuntos, carpetas, material de Syntra, fotos y dictado por micrófono.
- **Generación de material:** a partir de un archivo arma flashcards, cuestionarios, mapas mentales, resúmenes y guías de preguntas, que se revisan antes de guardar.
- **Lectura de planes de estudio:** pasa el plan a una lista de materias con correlativas, aunque esté escaneado, y pregunta si hay algo que elegir.
- **En segundo plano:** mientras la IA trabaja se puede seguir usando la app; un aviso al costado muestra el progreso.
- **Con y sin internet:** Azure OpenAI (GPT-5 mini) y, sin conexión, Gemma en la propia compu con Ollama.

### Accesibilidad y modo voz
- **Modo voz:** Syntra lee la pantalla, los botones y lo que se escribe. Se activa con **Ctrl + Alt + S** y funciona junto con NVDA.
- **Navegación con el teclado** en menús, calendarios y grillas.
- **Login facial guiado por voz**, que indica cómo ubicarse frente a la cámara.
- **Lectura de documentos** en voz alta, por títulos y párrafos.
- **Dictado** con Whisper, en la propia compu y sin internet.

### Organización y trabajo en grupo
- **Calendario, horarios y metas:** eventos con recordatorios, horarios de cursado (vista semanal o por materia) y metas mensuales.
- **Google Calendar:** copia eventos, parciales, sesiones, clases y metas a un calendario "Syntra" en tu cuenta de Google.
- **Proyectos colaborativos:** roles (propietario, editor, lector), tablero de tareas, cronograma tipo Gantt, metas y material compartido, sincronizados entre computadoras con Supabase.
- **Estadísticas:** horas estudiadas por materia, sesiones, flashcards, cuestionarios, metas y proyectos, por semana, mes, 4 o 6 meses.
- **Notificaciones y bienestar:** recordatorios de eventos, metas y repasos (también por correo) y avisos si se planifica o estudia demasiado en un día.
- **Perfil y apariencia:** foto o avatar, apodo, modo claro u oscuro y varias paletas de colores.

## <img src="docs/iconos-syntra/capturas.svg" height="30" align="middle"> Capturas

**Login facial**
Inicio de sesión con la cámara, sin contraseña.



**Dashboard**
Calendario, eventos y metas en una sola vista.



**Material de estudio**
Archivos y carpetas con búsqueda, vista previa y notas rápidas.



**Flashcards**
Mazos y repaso con repetición espaciada.



**Sesiones de estudio**
Documento con imágenes, objetivos, Pomodoro y música.



**Chat con IA**
Consultas con tu agenda, archivos adjuntos y dictado.



**Estadísticas**
Horas, sesiones, flashcards y cuestionarios por período.



**Proyectos**
Trabajo en grupo dentro de un mismo proyecto.


## <img src="docs/iconos-syntra/arquitectura.svg" height="30" align="middle"> Arquitectura

La app sigue la estructura de Electron en tres procesos (interfaz, preload y proceso principal), con la lógica separada por capas. Cada pedido baja de una capa a la siguiente, sin saltearse ninguna:

| Capa | Carpeta | Qué hace |
|---|---|---|
| Interfaz | `src/renderer/` | Pantallas en React. Solo habla con el preload, nunca con la base |
| Preload (puente) | `src/preload/` | Expone a la interfaz una API chica por módulo (`window.api`) |
| Comunicación (IPC) | `src/main/ipc/` | Un handler por módulo: valida los datos con Zod y llama a la fachada |
| Administración de persistencia | `src/main/administracionDePersistencia/` | Fachadas: un único punto de entrada por módulo |
| Lógica persistente | `src/main/logicaPersistente/gestionDe<Modulo>/` | Casos de uso que guardan o leen datos (una clase por acción), con entidades, DTOs y materializador |
| Lógica no persistente | `src/main/logicaNoPersistente/` | Lo que no toca la base: IA, dictado, notificaciones, lectura de planes, Drive, Google Calendar, Spotify |
| Persistencia | `src/main/persistencia/` | Conexión a PostgreSQL y ejecución de SQL genérico |
| Base de datos | `db/init/` | Scripts SQL numerados que crean y actualizan las tablas |

Las clases de lógica reciben la persistencia por constructor (inyección de dependencias), así cada módulo se puede probar por separado. Todas las dependencias se arman en `src/main/index.ts`.

## <img src="docs/iconos-syntra/tecnologias.svg" height="30" align="middle"> Tecnologías

- **Escritorio:** Electron + electron-vite, instaladores con electron-builder
- **Interfaz:** React + TypeScript
- **Base de datos:** PostgreSQL (con Docker para desarrollar; la app instalada trae su propia base), búsqueda con `pg_trgm`, validación con Zod
- **Inteligencia artificial:** Azure OpenAI (GPT-5 mini) y Ollama (Gemma) sin internet
- **Voz:** síntesis de voz del sistema y dictado con Whisper (transformers.js)
- **Reconocimiento facial:** face-api
- **Documentos:** react-pdf, pdf-lib, mammoth, TipTap, ExcelJS, KaTeX
- **Sincronización de proyectos:** Supabase
- **Correo:** Nodemailer
- **Integraciones:** Google Drive, Google Calendar y Spotify
- **Tests:** Vitest y tsx

## <img src="docs/iconos-syntra/como-correrlo.svg" height="30" align="middle"> Cómo correrlo

**Requisitos:** Node.js 24.17 o superior y Docker Desktop.

1. Clonar el repositorio e instalar dependencias

   ```bash
   git clone https://github.com/ludmilaaperetti/Syntra.git
   cd Syntra
   npm install
   ```

2. Crear el archivo `.env` a partir de la plantilla y completarlo

   ```bash
   cp .env.example .env
   ```

3. Levantar la app (también levanta PostgreSQL en Docker)

   ```bash
   npm run dev
   ```

**Sin Docker:** con `SYNTRA_BASE_EMBEBIDA=true` en el `.env`, `npm run dev:sin-docker` usa la misma base propia que la app instalada.

**Datos de prueba:** `npm run db:demo` carga una usuaria con historial completo (entrar con `sofi@syntra.demo` / `demo1234`) y `npm run db:demo:borrar` la saca.

**Base de Docker ya creada:** Docker corre los scripts de `db/init/` solo la primera vez. Cuando se agrega un script nuevo, hay que aplicarlo a mano:

```powershell
Get-Content db/init/NNN_nombre.sql -Raw | docker exec -i app_postgres sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB'
```

### App de escritorio

```bash
npm run package
```

El instalador queda en `dist/`:

- **Windows:** `Syntra Setup 1.0.0.exe`. Para armarlo hay que activar el *Modo de programador* de Windows.
- **Linux:** un `.AppImage` y un `.deb` (se arman desde Linux).

La app instalada no necesita Docker: trae su propia base de datos, que se crea sola al abrirla por primera vez. El `.env` se incluye dentro del instalador.

### Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Base de datos local (Docker) |
| `POSTGRES_HOST`, `POSTGRES_PORT` | Conexión (por defecto `localhost:5433`) |
| `SYNTRA_BASE_EMBEBIDA` | `true` para desarrollar con la base propia, sin Docker |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Correos de verificación, recuperación y recordatorios |
| `AZURE_RECURSO`, `AZURE_DESPLIEGUE`, `AZURE_OPENAI_API_KEY` | Inteligencia artificial con Azure OpenAI |
| `OLLAMA_MODELO`, `OLLAMA_HOST` | Inteligencia artificial sin internet (Ollama) |
| `IA_MAX_TOKENS_FRAGMENTO` | Tamaño de cada parte en que se divide un archivo largo para la IA |
| `MAIN_VITE_SUPABASE_URL`, `MAIN_VITE_SUPABASE_ANON_KEY` | Sincronización de proyectos |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Drive y Google Calendar |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_PUERTO_REDIRECCION` | Reproductor de Spotify en las sesiones |

Para Google Drive y Google Calendar, el proyecto de Google Cloud tiene que tener habilitadas la **Google Drive API** y la **Google Calendar API**, con los permisos `drive.file` y `calendar.app.created`. Mientras la app esté en modo prueba, solo pueden entrar los correos cargados como usuarios de prueba.

## <img src="docs/iconos-syntra/tests.svg" height="30" align="middle"> Tests

Los tests de Vitest se corren todos juntos:

```bash
npm test
```

Los casos de uso que tienen su test en un archivo `testXxx.ts` se corren con `tsx`:

```bash
npx tsx src/main/tests/CARPETA_DEL_MODULO/testNOMBRE.ts
```

## <img src="docs/iconos-syntra/equipo.svg" height="30" align="middle"> Equipo

Proyecto desarrollado para la materia **Seminario** de Ingeniería en Sistemas de Información, **UTN Facultad Regional Villa María**, 2026.

- Dana Diez Gomez — [@Danitaaaa](https://github.com/Danitaaaa)
- Alba Heredia
- Carolina Magagnini
- Ludmila Peretti
