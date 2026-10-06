import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { LoginPage } from "./pages/Login/LoginPage";
import { RegistrarUsuarioPage } from "./pages/RegistrarUsuario/RegistrarUsuarioPage";
import { VerificarMailPage } from "./pages/VerificarMail/VerificarMailPage";
import { VerificarCodigoPage } from "./pages/VerificarCodigo/VerificarCodigoPage";
import { CambiarPasswordPage } from "./pages/CambiarPassword/CambiarPasswordPage";
import { RecuperarPasswordPage } from "./pages/RecuperarPassword/RecuperarPasswordPage";
import { Dashboard } from "./pages/Dashboard/Dashboard";
import { NodoPage } from "./pages/materialEstudio/nodoPage";
import { SplashScreen } from "./pages/Splash/SplashScreen";
import { cargarModelos } from "../lib/cargarModelos";

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
    </Routes>
  );
}