import { useState } from "react";
import { UsarCamara } from "../../hooks/UsarCamara";
import { ObtenerEmbedding } from "../../../lib/ObtenerEmbeddings";
import { Button } from "../../components/ui/Button/Button";

interface Props {
  usuarioId: number;
  onCerrar: () => void;
  onListo: () => void;
}

export function ActualizarRostro({ usuarioId, onCerrar, onListo }: Props) {
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
      const resultado = await window.api.registrarRostro(usuarioId, embedding);
      if (resultado.exito) onListo();
      else setMensaje(resultado.mensaje);
    } catch {
      setMensaje("Ocurrió un error al registrar el rostro.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="perfil__modal-overlay">
      <div className="perfil__modal">
        <h3 className="perfil__titulo">Actualizar rostro</h3>
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
      </div>
    </div>
  );
}