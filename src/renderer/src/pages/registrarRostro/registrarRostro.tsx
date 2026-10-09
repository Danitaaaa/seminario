import { useState } from 'react'
import { UsarCamara } from '../../hooks/UsarCamara'
import { ObtenerEmbedding } from '../../../lib/obtenerEmbeddings'
import { Button } from '../../components/ui/Button/Button'
import { Title } from '../../components/ui/Title/Title'
import { CartelError } from '../../components/ui/commons/CartelesError'
 
interface Props {
  usuarioId: number
  onRegistroExitoso: () => void
}
 
export default function RegistrarRostro({ usuarioId, onRegistroExitoso }: Props) {
  const { videoRef, camaraLista, error, alCargarVideo } = UsarCamara()
  const [mensaje, setMensaje] = useState('')
  const [mensajeError, setMensajeError] = useState('')
  const [procesando, setProcesando] = useState(false)
  
  let textoBoton = 'Tomar foto y registrar'

  if (procesando) {
    textoBoton = 'Procesando...'
  }
 
  const registrar = async () => {
    if (!videoRef.current) return
    setProcesando(true)
    setMensajeError('')
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
      setMensajeError(error instanceof Error ? error.message : String(error))
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
      {error && <CartelError mensaje={error} />}
      {mensajeError && <CartelError mensaje={mensajeError} onCerrar={() => setMensajeError('')} />}
      <p role="status">{mensaje}</p>
    </div>
  )
}