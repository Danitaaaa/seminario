import { Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/Login/LoginPage";
import { RegistrarUsuarioPage } from "./pages/RegistrarUsuario/RegistrarUsuarioPage";
import { VerificarMailPage } from "./pages/VerificarMail/VerificarMailPage";

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

    </Routes>
  );
}