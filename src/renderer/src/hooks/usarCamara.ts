import { useEffect, useRef, useState } from 'react'
 
export function UsarCamara() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [camaraLista, setCamaraLista] = useState(false)
  const [error, setError] = useState('')
 
  useEffect(() => {
    let flujoCamara: MediaStream | null = null
    let efectoCancelado = false
 
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((flujo) => {
        if (efectoCancelado) {
          flujo.getTracks().forEach((pista) => pista.stop())
          return
        }
        flujoCamara = flujo
        if (videoRef.current) videoRef.current.srcObject = flujo
      })
      .catch(() => setError('No se pudo acceder a la cámara.'))
 
    return () => {
      efectoCancelado = true
      flujoCamara?.getTracks().forEach((pista) => pista.stop())
    }
  }, [])
 
  return { videoRef, camaraLista, error, alCargarVideo: () => setCamaraLista(true) }
}