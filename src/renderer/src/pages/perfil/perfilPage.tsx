import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { PlantillaLayout } from "../plantillaLayout/plantillaLayout";
import { Button } from "../../components/ui/Button/Button";
import { Input } from "../../components/ui/Input/Input";
import { CartelError } from "../../components/ui/commons/CartelesError";
import { obtenerUsuarioId, cerrarSesion } from "../../../lib/sesion";
import type { Perfil } from "../../types/perfil";
import { ActualizarRostro } from "./actualizarRostro";
import { EVENTO_PERFIL_ACTUALIZADO } from "../../componentes/layout/menuUsuario";
import "../../estilos/perfil.css";

// Saca el prefijo que agrega Electron a los errores que vienen del proceso principal.
const mensajeDe = (error: unknown) =>
  error instanceof Error
    ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "")
    : "Ocurrió un error inesperado.";

export function PerfilPage() {
  const navigate = useNavigate();
  const usuarioId = obtenerUsuarioId();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordRepetida, setPasswordRepetida] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [mostrarRostro, setMostrarRostro] = useState(false);

  useEffect(() => {
    if (!usuarioId) {
      navigate("/");
      return;
    }
    window.api.obtenerPerfil({ id: usuarioId })
      .then(cargarFormulario)
      .catch((e) => setError(mensajeDe(e)));
    window.api.obtenerFotoPerfil({ id: usuarioId })
      .then(setFoto)
      .catch((e) => setError(mensajeDe(e)));
  }, []);

  function cargarFormulario(datos: Perfil): void {
    setPerfil(datos);
    setNombre(datos.nombre);
    setApellido(datos.apellido);
    setEmail(datos.email);
    setPasswordActual("");
    setPasswordNueva("");
    setPasswordRepetida("");
  }

  async function elegirFoto(): Promise<void> {
    if (!usuarioId) return;
    setError("");
    try {
      const nueva = await window.api.elegirFotoPerfil({ id: usuarioId });
      if (nueva) setFoto(nueva);
    } catch (e) {
      setError(mensajeDe(e));
    }
  }

  function rostroActualizado(): void {
    setMostrarRostro(false);
    if (perfil) setPerfil({ ...perfil, tieneRostro: true });
    setExito("El rostro se actualizó correctamente.");
  }

  async function guardar(): Promise<void> {
    if (!usuarioId) return;
    setError("");
    setExito("");

    const cambiaPassword = Boolean(passwordActual || passwordNueva || passwordRepetida);
    if (cambiaPassword && passwordNueva !== passwordRepetida) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setGuardando(true);
    try {
      const actualizado = await window.api.modificarPerfil({ id: usuarioId, nombre, apellido, email });
      if (cambiaPassword) {
        await window.api.cambiarPasswordActual({ id: usuarioId, passwordActual, passwordNueva });
      }
      cargarFormulario(actualizado);
      window.dispatchEvent(new Event(EVENTO_PERFIL_ACTUALIZADO));
      setExito("Los cambios se guardaron correctamente.");
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(): Promise<void> {
    if (!usuarioId) return;
    try {
      await window.api.eliminarUsuario({ id: usuarioId });
      cerrarSesion();
      navigate("/");
    } catch (e) {
      setError(mensajeDe(e));
      setConfirmandoEliminar(false);
    }
  }

  const iniciales = perfil ? `${perfil.nombre[0] ?? ""}${perfil.apellido[0] ?? ""}`.toUpperCase() : "";

  return (
    <PlantillaLayout
      titulo="Editar perfil"
      idActivo="perfil"
      usuario={{ nombre: perfil?.nombre ?? "Usuario" }}
    >
      <div className="perfil">
        <aside className="perfil__lateral">
          <div className="perfil__avatar">
            {foto
              ? <img src={foto} alt="Foto de perfil" className="perfil__avatar-img" />
              : <span aria-hidden="true">{iniciales}</span>}
          </div>
          <button type="button" className="perfil__boton-lateral" onClick={elegirFoto}>
            Editar foto de perfil
          </button>
          <button type="button" className="perfil__boton-lateral perfil__boton-lateral--contorno"
            onClick={() => setMostrarRostro(true)}>
            {perfil?.tieneRostro ? "Actualizar rostro" : "Registrar rostro"}
          </button>
        </aside>

        <div className="perfil__columna">
          {perfil && (
            <section className="perfil__tarjeta">
              <h2 className="perfil__nombre">{perfil.nombre} {perfil.apellido}</h2>
              <p className="perfil__dato"><Mail size={14} /> {perfil.email}</p>
              <p className="perfil__dato">@{perfil.apodo}</p>
            </section>
          )}

          <section className="perfil__tarjeta">
            <h3 className="perfil__titulo">Datos personales</h3>
            <div className="perfil__campo">
              <span className="perfil__etiqueta">Nombre</span>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="perfil__campo">
              <span className="perfil__etiqueta">Apellido</span>
              <Input value={apellido} onChange={(e) => setApellido(e.target.value)} />
            </div>
            <div className="perfil__campo">
              <span className="perfil__etiqueta">Correo electrónico</span>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </section>

          <section className="perfil__tarjeta">
            <h3 className="perfil__titulo">Contraseña</h3>
            <div className="perfil__campo">
              <span className="perfil__etiqueta">Contraseña actual</span>
              <Input type="password" placeholder="Contraseña actual" value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)} />
            </div>
            <div className="perfil__campo">
              <span className="perfil__etiqueta">Contraseña nueva</span>
              <Input type="password" placeholder="Contraseña nueva" value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)} />
              <p className="perfil__ayuda">Debe tener al menos 8 caracteres, un número y una mayúscula.</p>
            </div>
            <div className="perfil__campo">
              <span className="perfil__etiqueta">Repetir contraseña</span>
              <Input type="password" placeholder="Repetir contraseña" value={passwordRepetida}
                onChange={(e) => setPasswordRepetida(e.target.value)} />
            </div>
          </section>

          <section className="perfil__peligro">
            <span>
              {confirmandoEliminar
                ? "¿Seguro? Se borran tu cuenta y tus eventos."
                : "Esta acción es permanente y no se puede deshacer."}
            </span>
            {confirmandoEliminar ? (
              <div className="perfil__peligro-acciones">
                <button type="button" className="perfil__boton-peligro" onClick={() => setConfirmandoEliminar(false)}>
                  Cancelar
                </button>
                <button type="button" className="perfil__boton-peligro perfil__boton-peligro--confirmar" onClick={eliminar}>
                  Sí, eliminar
                </button>
              </div>
            ) : (
              <button type="button" className="perfil__boton-peligro" onClick={() => setConfirmandoEliminar(true)}>
                Eliminar usuario
              </button>
            )}
          </section>

          {error && <CartelError mensaje={error} onCerrar={() => setError("")} />}
          {exito && <p className="perfil__exito">{exito}</p>}

          <div className="perfil__acciones">
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Aceptar"}
            </Button>
            <Button variant="secondary" onClick={() => perfil && cargarFormulario(perfil)}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>

      {mostrarRostro && usuarioId && (
        <ActualizarRostro
          usuarioId={usuarioId}
          onCerrar={() => setMostrarRostro(false)}
          onListo={rostroActualizado}
        />
      )}
    </PlantillaLayout>
  );
}