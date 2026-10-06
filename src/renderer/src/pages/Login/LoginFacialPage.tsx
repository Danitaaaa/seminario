import { useState } from "react";
import { UsarCamara } from "../../hooks/UsarCamara";
import { ObtenerEmbedding } from "../../../lib/ObtenerEmbeddings"; 
import { Button } from "../../components/ui/Button/Button";

interface Props {
  onLoginExitoso: (usuarioId: number) => void
}
 
export default function LoginFacial({ onLoginExitoso }: Props) {
  const { videoRef, camaraLista, error, alCargarVideo } = UsarCamara()
  const [mensaje, setMensaje] = useState('')
  const [procesando, setProcesando] = useState(false)
  let textoBoton = 'Iniciar sesión con rostro'

  if (procesando) {
    textoBoton = 'Verificando...'
  }
 
  const iniciarSesion = async () => {
    if (!videoRef.current) {
      return
    }

    setProcesando(true)
    setMensaje('Verificando rostro...')
    try {
      const embedding = await ObtenerEmbedding(videoRef.current)
      if (!embedding) {
        setMensaje('No se detectó ningún rostro. Probá con más luz y de frente.')
        return
      }

      const resultado = await window.api.loginFacial(embedding)
      if (resultado.exito) {
        onLoginExitoso(resultado.usuarioId)
      } else {
        setMensaje(resultado.mensaje)
      }
    } catch {
      setMensaje('Ocurrió un error al verificar el rostro.')
    } finally {
      setProcesando(false)
    }
  }
 
  return (
    <div className="login-facial">
      <video ref={videoRef} autoPlay muted playsInline width={400}
             onLoadedData={alCargarVideo} />
      <Button onClick={iniciarSesion} disabled={!camaraLista || procesando}>
        {textoBoton}
      </Button>
      <p>{error || mensaje}</p>
    </div>
  )
}
