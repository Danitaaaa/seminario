import { useState } from "react";
import { UsarCamara } from "../../hooks/usarCamara";
import { ObtenerEmbedding } from "../../../lib/obtenerEmbeddings";
import { Button } from "../../components/ui/button/button";

interface Props {
  onLoginExitoso: (usuarioId: number) => void
}

export async function verificarLoginFacial(video: HTMLVideoElement) {
  const embedding = await ObtenerEmbedding(video)
  if (!embedding) return { tipo: 'rostro-no-detectado' } as const

  const resultado = await window.api.loginFacial(embedding)
  return { tipo: 'resultado' as const, resultado }
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
      const resultadoLogin = await verificarLoginFacial(videoRef.current)
      if (resultadoLogin.tipo === 'rostro-no-detectado') {
        setMensaje('No se detectó ningún rostro. Probá con más luz y de frente.')
        return
      }

      const { resultado } = resultadoLogin
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
