import { useState } from "react";
import { UsarCamara } from "../../hooks/usarCamara";
import { ObtenerEmbedding } from "../../../lib/obtenerEmbeddings";
import { Button } from "../../components/ui/button/button";
import { Input } from "../../components/ui/input/input";

interface Props {
  usuarioId: number;
  onCerrar: () => void;
  onListo: () => void;
  onOlvide: () => Promise<void>;
}

// Saca el prefijo que agrega Electron a los errores que vienen del proceso principal.
const mensajeDe = (error: unknown) =>
  error instanceof Error
    ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "")
    : "Ocurrió un error inesperado.";

// Paso 1: confirmar la contraseña. Paso 2: capturar el rostro nuevo.
export function ActualizarRostro({ usuarioId, onCerrar, onListo, onOlvide }: Props) {
  const [password, setPassword] = useState("");
  const [confirmada, setConfirmada] = useState(false);
  const [error, setError] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);

  async function olvide(): Promise<void> {
    setError("");
    setEnviandoCodigo(true);
    try {
      await onOlvide();
    } catch (e) {
      setError(mensajeDe(e));
      setEnviandoCodigo(false);
    }
  }

  async function confirmar(): Promise<void> {
    if (!password) {
      setError("Ingresá tu contraseña.");
      return;
    }
    setError("");
    setVerificando(true);
    try {
      await window.api.verificarPassword({ id: usuarioId, password });
      setConfirmada(true);
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setVerificando(false);
    }
  }

  return (
    <div className="perfil__modal-overlay">
      <div className="perfil__modal">
        <h3 className="perfil__titulo">Actualizar rostro</h3>
        {confirmada ? (
          <CapturaRostro usuarioId={usuarioId} password={password} onCerrar={onCerrar} onListo={onListo} />
        ) : (
          <>
            <p className="perfil__ayuda">Por seguridad, confirmá tu contraseña antes de cambiar tu rostro.</p>
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmar()}
              autoFocus
            />
            <button type="button" className="perfil__olvide" onClick={olvide} disabled={enviandoCodigo}>
              {enviandoCodigo ? "Enviando código a tu correo..." : "¿Olvidaste tu contraseña?"}
            </button>
            {error && <p className="perfil__error">{error}</p>}
            <div className="perfil__acciones">
              <Button onClick={confirmar} disabled={verificando}>
                {verificando ? "Verificando..." : "Continuar"}
              </Button>
              <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface CapturaProps {
  usuarioId: number;
  password: string;
  onCerrar: () => void;
  onListo: () => void;
}

// La cámara recién se enciende en este paso, no mientras se escribe la contraseña.
function CapturaRostro({ usuarioId, password, onCerrar, onListo }: CapturaProps) {
  const { videoRef, camaraLista, error, alCargarVideo } = UsarCamara();
  const [mensaje, setMensaje] = useState("");
  const [procesando, setProcesando] = useState(false);

  const capturar = async () => {
    if (!videoRef.current) return;
    setProcesando(true);
    setMensaje("Analizando rostro...");
    try {
      const embedding = await ObtenerEmbedding(videoRef.current);
      if (!embedding) {
        setMensaje("No se detectó ningún rostro. Probá con más luz y de frente.");
        return;
      }
      const resultado = await window.api.actualizarRostro({ id: usuarioId, password, embedding });
      if (resultado.exito) onListo();
      else setMensaje(resultado.mensaje);
    } catch (e) {
      setMensaje(mensajeDe(e));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <>
      <p className="perfil__ayuda">Mirá a la cámara de frente y con buena luz.</p>
      <video ref={videoRef} autoPlay muted playsInline className="perfil__video"
        onLoadedData={alCargarVideo} />
      <p className="perfil__ayuda">{error || mensaje}</p>
      <div className="perfil__acciones">
        <Button onClick={capturar} disabled={!camaraLista || procesando}>
          {procesando ? "Procesando..." : "Capturar"}
        </Button>
        <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
      </div>
    </>
  );
}