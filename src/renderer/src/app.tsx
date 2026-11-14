import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { LoginPage } from "./pages/login/loginPage";
import { RegistrarUsuarioPage } from "./pages/registrarUsuario/registrarUsuarioPage";
import { VerificarMailPage } from "./pages/verificarMail/verificarMailPage";
import { VerificarCodigoPage } from "./pages/verificarCodigo/verificarCodigoPage";
import { CambiarPasswordPage } from "./pages/cambiarPassword/cambiarPasswordPage";
import { RecuperarPasswordPage } from "./pages/recuperarPassword/recuperarPasswordPage";
import { Dashboard } from "./pages/dashboard/dashboard";
import { NodoPage } from "./pages/materialEstudio/nodoPage";
import { SplashScreen } from "./pages/splash/splashScreen";
import { cargarModelos } from "../lib/cargarModelos";
import { Proximamente } from "./pages/proximamente/proximamente";
import { EventosPage } from "./pages/eventos/eventosPage";
import { HorariosPage } from "./pages/horarios/horariosPage";
import { MateriasPage } from "./pages/materias/materiasPage";
import { CuadernosPage } from "./pages/cuadernos/cuadernosPage";
import { CuadernoPage } from "./pages/cuadernos/cuadernoPage";
import { MiniEstante } from "./components/cuadernos/miniEstante";
import { FormacionPage } from "./pages/materias/formacionPage";
import { CargarPlanPage } from "./pages/materias/cargarPlanPage";
import { PerfilPage } from "./pages/perfil/perfilPage";
import { Anunciador } from "./voz/anunciador";
import { PanelPerfil } from "./pages/perfil/panelPerfil";
import { AjustesPage } from "./pages/ajustes/ajustesPage";
import { MetodosPage } from "./pages/metodos/metodosPage";
import { RepeticionEspaciadaPage } from "./pages/metodos/repeticionEspaciadaPage";
import { MaterialesIAPage } from "./pages/metodos/materialesIAPage";
import { ResumenesPage } from "./pages/metodos/resumenesPage";
import { ResumenIAPage } from "./pages/metodos/resumenIAPage";
import { MapaMentalIAPage } from "./pages/metodos/mapaMentalIAPage";
import { ChatIAPage } from "./pages/chat/chatIAPage";
import { ProveedorBloqueoSesion } from "./components/sesionEstudio/bloqueoPracticaActiva";
import { CuestionarioIAPage } from "./pages/metodos/cuestionarioIAPage";
import { ResolverCuestionarioPage } from "./pages/metodos/resolverCuestionarioPage";
import { DeckFlashcardsPage, EstudiarFlashcardsPage, FlashcardsPage } from "./pages/flashcards/flashcardsPage";
import { CronogramaPage } from "./pages/cronograma/cronogramaPage";
import { ProyectosPage } from "./pages/proyectos/proyectosPage";
import { ProyectoDetallePage } from "./pages/proyectos/proyectoPage";
import { TareasPage } from "./pages/proyectos/tareasPage";
import { EstadisticasPage } from "./pages/estadisticas/estadisticasPage";
import { SesionesEstudioPage } from "./pages/sesionesEstudio/sesionesEstudioPage";
import { CrearSesionEstudioPage } from "./pages/sesionesEstudio/crearSesionEstudioPage";
import { SesionEstudioPage } from "./pages/sesionesEstudio/sesionEstudioPage";
import { GuiasPreguntasPage } from "./pages/guiaPreguntas/guiaPreguntasPage";
import { ProveedorAvisos } from "./hooks/usarAvisos";
import { ProveedorSpotify } from "./hooks/usarSpotify";
import { ModalBienvenidaVoz } from "./components/comunes/modalBienvenidaVoz";
import { EcoTeclado } from "./voz/ecoTeclado";
import { AnunciarPantalla } from "./voz/anunciarPantalla";
import { LectorFoco } from "./voz/lectorFoco";
import { NavegacionFlechas } from "./voz/navegacionFlechas";


export default function App() {
  const [mostrarSplash, setMostrarSplash] = useState(true);

  useEffect(() => {
    cargarModelos().catch(console.error);
  }, []);

  if (mostrarSplash) {
    return <SplashScreen onFinish={() => setMostrarSplash(false)} />;
  }

  return (
    <ProveedorAvisos>
    <ProveedorSpotify>
      <ModalBienvenidaVoz />
    {/* Práctica activa: mientras dura la sesión no se puede salir de ella (ver bloqueoPracticaActiva.tsx). */}
    <ProveedorBloqueoSesion>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/registro" element={<RegistrarUsuarioPage />} />
        <Route path="/verificar-mail" element={<VerificarMailPage />} />
        <Route path="/recuperar-contraseña" element={<RecuperarPasswordPage />} />
        <Route path="/verificar-codigo" element={<VerificarCodigoPage />} />
        <Route path="/cambioPassword" element={<CambiarPasswordPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/material" element={<NodoPage lateral={<MiniEstante />} />} />
        <Route path="/eventos" element={<EventosPage />} />
        <Route path="/horarios" element={<HorariosPage />} />
        <Route path="/materias" element={<MateriasPage />} />
        <Route path="/cuadernos" element={<CuadernosPage />} />
        <Route path="/cuadernos/:idCuaderno" element={<CuadernoPage />} />
        <Route path="/materias/formacion" element={<FormacionPage />} />
        <Route path="/materias/formacion/:idFormacion" element={<FormacionPage />} />
        <Route path="/materias/plan/:idFormacion" element={<CargarPlanPage />} />
        <Route path="/cronograma" element={<CronogramaPage />} />
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="/ajustes" element={<AjustesPage />} />
        <Route path="/metodos" element={<MetodosPage />} />
        <Route path="/flashcards" element={<FlashcardsPage />} />
        <Route path="/flashcards/:deckId" element={<DeckFlashcardsPage />} />
        <Route path="/flashcards/:deckId/estudiar" element={<EstudiarFlashcardsPage />} />
        <Route path="/repeticion-espaciada" element={<RepeticionEspaciadaPage />} />
        {/* Los resúmenes son documentos en Material › "Resúmenes" (como las guías); /resumenes/:id muestra los de antes. */}
        <Route path="/resumenes" element={<ResumenesPage />} />
        <Route path="/resumenes/:id" element={<ResumenIAPage />} />
        <Route path="/cuestionarios" element={<MaterialesIAPage key="cuestionario" tipo="cuestionario" />} />
        <Route path="/cuestionarios/:id" element={<CuestionarioIAPage />} />
        <Route path="/cuestionarios/:id/resolver" element={<ResolverCuestionarioPage />} />
        <Route path="/mapas-mentales" element={<MaterialesIAPage key="mapaMental" tipo="mapaMental" />} />
        <Route path="/mapas-mentales/:id" element={<MapaMentalIAPage />} />
        <Route path="/proyectos" element={<ProyectosPage />} />
        <Route path="/proyectos/:id" element={<ProyectoDetallePage />} />
        <Route path="/proyectos/:id/eventos" element={<EventosPage />} />
        <Route path="/proyectos/:id/tareas" element={<TareasPage />} />
        <Route path="/sesiones" element={<SesionesEstudioPage />} />
        <Route path="/sesiones/nueva" element={<CrearSesionEstudioPage />} />
        <Route path="/sesiones/:idSesion" element={<SesionEstudioPage />} />
        <Route path="/estadisticas" element={<EstadisticasPage />} />
        {/* Una sola ruta con :id opcional: al crear una conversación la pantalla no se vuelve a montar. */}
        <Route path="/chat/:id?" element={<ChatIAPage />} />
        <Route path="/proximamente/:id" element={<Proximamente />} />
        <Route path="/guias-preguntas" element={<GuiasPreguntasPage />} />
      </Routes>
      <PanelPerfil />
      <Anunciador />
      <AnunciarPantalla />
      <EcoTeclado activo />
      <LectorFoco />
      <NavegacionFlechas />
    </ProveedorBloqueoSesion>
    </ProveedorSpotify>
    </ProveedorAvisos>
  );
}
