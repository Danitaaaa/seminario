import { Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/Login/LoginPage";
import { RegistrarUsuarioPage } from "./pages/RegistrarUsuario/RegistrarUsuarioPage";
import { VerificarMailPage } from "./pages/VerificarMail/VerificarMailPage";
import { VerificarCodigoPage } from "./pages/VerificarCodigo/VerificarCodigoPage";
import { CambiarPasswordPage } from "./pages/CambiarPassword/CambiarPasswordPage";
import { RecuperarPasswordPage } from "./pages/RecuperarPassword/RecuperarPasswordPage";

export default function App() {

  return (
    
    <Routes>

      <Route
        path="/"
        element={<LoginPage />}
      />

      <Route
        path="/registro"
        element={<RegistrarUsuarioPage />}
      />

      <Route
        path="/verificar-mail"
        element={<VerificarMailPage />}
      />

      <Route
        path="/recuperar-contraseña"
        element={<RecuperarPasswordPage />}
      />

      <Route 
        path="/verificar-codigo"
        element={<VerificarCodigoPage />}
      />

      <Route
        path="/cambioPassword"
        element={<CambiarPasswordPage />}
      />

    </Routes>
  );
}