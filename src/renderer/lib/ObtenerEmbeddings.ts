import * as faceapi from '@vladmandic/face-api'
import { cargarModelos } from './cargarModelos'
 
export async function ObtenerEmbedding(
  video: HTMLVideoElement
): Promise<number[] | null> {
  await cargarModelos()
 
  const deteccion = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()
 
  if (!deteccion) return null
  return Array.from(deteccion.descriptor)
}
