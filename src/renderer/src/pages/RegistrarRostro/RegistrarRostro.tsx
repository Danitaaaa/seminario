import { useState } from 'react'
import { UsarCamara } from '../../hooks/UsarCamara'
import { ObtenerEmbedding } from '../../../lib/ObtenerEmbeddings'
import { Button } from '../../components/ui/Button/Button'
import { Title } from '../../components/ui/Title/Title'
 
interface Props {
  usuarioId: string
  onRegistroExitoso: () => void
}
 
export default function RegistrarRostro({ usuarioId, onRegistroExitoso }: Props) {
  const { videoRef, camaraLista, error, alCargarVideo } = UsarCamara()
  const [mensaje, setMensaje] = useState('')
  const [procesando, setProcesando] = useState(false)
  
  let textoBoton = 'Tomar foto y registrar'

  if (procesando) {
    textoBoton = 'Procesando...'
  }
 
  const registrar = async () => {
    if (!videoRef.current) return
    setProcesando(true)
    setMensaje('Detectando rostro...')
    try {
      const embedding = await ObtenerEmbedding(videoRef.current)
      if (!embedding) {
        setMensaje('No se detectó ningún rostro. Probá con más luz y de frente.')
        return
      }
      const respuesta = await window.api.registrarRostro(usuarioId, embedding)
      setMensaje(respuesta.mensaje)
      if (respuesta.exito) onRegistroExitoso()
    } catch (error) {
      console.error('Error al registrar el rostro:', error)
      const mensajeError = error instanceof Error ? error.message : String(error)
      setMensaje(`No se pudo registrar el rostro: ${mensajeError}`)
    } finally {
      setProcesando(false)
    }
  }
 
  return (
    <div className="registrar-rostro">
      <Title>Registrá tu rostro</Title>
      <video ref={videoRef} autoPlay muted playsInline width={400}
             onLoadedData={alCargarVideo} />
      <Button onClick={registrar} disabled={!camaraLista || procesando}>
        {textoBoton}
      </Button>
      <p role="status">{error || mensaje}</p>
    </div>
  )
}