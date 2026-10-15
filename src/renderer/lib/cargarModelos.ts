import * as faceapi from '@vladmandic/face-api'
const RUTA_MODELOS = import.meta.env.DEV ? '/models' : 'modelos://local'
 
let promesa: Promise<void> | null = null
 
export function cargarModelos(

): Promise<void> {
  if (!promesa) {
    promesa = (async () => {
      await (faceapi.tf as unknown as { ready: () => Promise<void> }).ready()
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(RUTA_MODELOS),
        faceapi.nets.faceLandmark68Net.loadFromUri(RUTA_MODELOS),
        faceapi.nets.faceRecognitionNet.loadFromUri(RUTA_MODELOS)
      ])
    })()
    promesa.catch(() => { promesa = null })
  }

  return promesa
}
