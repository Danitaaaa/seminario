<p align="center">
  <img src="docs/banner.png" alt="Syntra" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-44-495B7D?logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/React-18-23354D?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-495B7D?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-18-23354D?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/UTN-FRVM-02122F" alt="UTN FRVM">
</p>

<p align="center"><i>Tu material de estudio, organizado en un solo lugar.</i></p>

---

## <img src="docs/iconos-syntra/descripcion.svg" height="30" align="middle"> Descripción

**Syntra** (sinapsis + transformación) es una aplicación de escritorio para organizar el estudio: material, flashcards, sesiones de estudio, horarios y metas, todo en un mismo lugar. El inicio de sesión se hace por **reconocimiento facial** y la app incluye un **modo accesible por voz** pensado para personas no videntes.

## <img src="docs/iconos-syntra/funcionalidades.svg" height="30" align="middle"> Funcionalidades

- **Login facial** y registro de rostro, con recuperación de contraseña por correo.
- **Material de estudio:** archivos y carpetas, búsqueda y visualización/edición de PDF, Word y Excel.
- **Flashcards** con mazos y **repetición espaciada**.
- **Sesiones de estudio** con metas, flashcards integradas y música con Spotify.
- **Dashboard** con calendario, eventos y metas personales.
- **Proyectos grupales:** varios usuarios trabajando en un mismo proyecto.
- **Horarios** y **cronograma**.
- **Perfil y ajustes:** foto de perfil, paletas de colores y modo oscuro.
- **Notificaciones** de eventos y recordatorios.

## <img src="docs/iconos-syntra/capturas.svg" height="30" align="middle"> Capturas

**Login facial**
Inicio de sesión con la cámara, sin contraseña.



**Dashboard**
Calendario, eventos y metas en una sola vista.



**Material de estudio**
Archivos y carpetas con búsqueda y vista previa.



**Flashcards**
Mazos y repaso con repetición espaciada.



**Sesiones de estudio**
Sesiones con metas, flashcards y música.



**Proyectos**
Trabajo en grupo dentro de un mismo proyecto.


## <img src="docs/iconos-syntra/arquitectura.svg" height="30" align="middle"> Arquitectura

La app sigue la estructura de Electron en tres procesos, con la lógica separada por capas:

| Capa | Carpeta | Qué hace |
|---|---|---|
| Proceso principal | `src/main/` | Lógica de negocio, persistencia y handlers IPC (uno por módulo) |
| Preload | `src/preload/` | Expone a la interfaz una API chica por módulo (`window.api`) |
| Interfaz | `src/renderer/` | Pantallas en React |
| Base de datos | `db/init/` | Scripts SQL numerados que Postgres corre al primer arranque |

Las clases de lógica reciben la persistencia por constructor (inyección de dependencias), así cada módulo se puede probar por separado.

## <img src="docs/iconos-syntra/tecnologias.svg" height="30" align="middle"> Tecnologías

- **Escritorio:** Electron + electron-vite
- **Interfaz:** React + TypeScript
- **Base de datos:** PostgreSQL (con Docker), búsqueda con `pg_trgm`
- **Reconocimiento facial:** face-api
- **Documentos:** react-pdf, pdf-lib, mammoth, TipTap, ExcelJS
- **Correo:** Nodemailer
- **Integraciones:** Google Drive y Spotify

## <img src="docs/iconos-syntra/como-correrlo.svg" height="30" align="middle"> Cómo correrlo

**Requisitos:** Node.js 24.17 o superior y Docker Desktop.

1. Clonar el repositorio e instalar dependencias

   ```bash
   git clone https://github.com/Danitaaaa/syntra-respaldo.git
   cd syntra-respaldo
   npm install
   ```

2. Crear el archivo `.env` a partir de la plantilla y completarlo

   ```bash
   cp .env.example .env
   ```

3. Levantar la app (también levanta Postgres en Docker)

   ```bash
   npm run dev
   ```

### Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Base de datos local |
| `POSTGRES_HOST`, `POSTGRES_PORT` | Conexión (por defecto `localhost:5433`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Envío de correos (verificación y recuperación) |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_PUERTO_REDIRECCION` | Reproductor de Spotify en las sesiones |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Integración con Google Drive |

## <img src="docs/iconos-syntra/tests.svg" height="30" align="middle"> Tests

Cada caso de uso tiene su test en un archivo `testXxx.ts`, que se corre con `tsx`:

```bash
npx tsx src/main/tests/CARPETA_MODULO_A_TESTEAR/testNOMBRE DEL MODULO.ts
```

## <img src="docs/iconos-syntra/equipo.svg" height="30" align="middle"> Equipo

Proyecto desarrollado para la materia **Seminario** de Ingeniería en Sistemas de Información, **UTN Facultad Regional Villa María**, 2026.

- Dana Diez Gomez — [@Danitaaaa](https://github.com/Danitaaaa)
- Alba Heredia
- Carolina Magagnini
- Ludmila Peretti
