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

export default function App() {
  const [mostrarSplash, setMostrarSplash] = useState(true);

  useEffect(() => {
    cargarModelos().catch(console.error)
  }, [])

  if (mostrarSplash) {
    return <SplashScreen onFinish={() => setMostrarSplash(false)} />;
  }

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/registro" element={<RegistrarUsuarioPage />} />
      <Route path="/verificar-mail" element={<VerificarMailPage />} />
      <Route path="/recuperar-contraseña" element={<RecuperarPasswordPage />} />
      <Route path="/verificar-codigo" element={<VerificarCodigoPage />} />
      <Route path="/cambioPassword" element={<CambiarPasswordPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/material" element={<NodoPage />} />
            <Route path="/proximamente/:id" element={<Proximamente />} />
    </Routes>
  );
}