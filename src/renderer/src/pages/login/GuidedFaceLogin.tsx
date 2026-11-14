import { useCallback, useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Button } from '../../components/ui/button/button';
import { UsarCamara } from '../../hooks/usarCamara';
import '../../styles/voz.css';
import { hablar } from '../../utils/hablar';
import {
  analizarPosicionRostro,
  type PosicionRostro,
} from '../../utils/FacePositionAnalyzer';
import {
  obtenerAvisoGuia,
  type EstadoAvisoGuia,
} from '../../utils/FaceVoiceGuidance';
import * as FaceSounds from '../../utils/FaceSounds';
import { cargarModelos } from '../../../lib/cargarModelos';
import { verificarLoginFacial } from './loginFacialPage';

export type EstadoLoginGuiado = 'GUIANDO' | 'ESTABILIZANDO' | 'INGRESANDO' | 'FALLBACK';
export type ResponderFallbackVoz = (usarContraseña: boolean) => void;

interface Props {
  onLoginExitoso: (usuarioId: number) => void;
  onElegirContraseña: () => void;
  registrarRespuestaVozFallback?: (
    responder: ResponderFallbackVoz | null,
  ) => void;
}

const INTERVALO_ANALISIS_MS = 200;
const TIEMPO_ESTABILIDAD_MS = 1000;
const TIEMPO_LIMITE_MS = 20_000;
const MAX_INTENTOS = 3;
const PREGUNTA_FALLBACK = '¿Querés ingresar con contraseña?';

export function GuidedFaceLogin({
  onLoginExitoso,
  onElegirContraseña,
  registrarRespuestaVozFallback,
}: Props) {
  const { videoRef, camaraLista, error, alCargarVideo } = UsarCamara();
  const [fase, setFase] = useState<EstadoLoginGuiado>('GUIANDO');
  const [mensaje, setMensaje] = useState('');
  const [rostroCentrado, setRostroCentrado] = useState(false);
  const [intentos, setIntentos] = useState(0);
  const [modelosListos, setModelosListos] = useState(false);

  const faseRef = useRef<EstadoLoginGuiado>('GUIANDO');
  const estadoGuiaRef = useRef<EstadoAvisoGuia>({
    clave: null,
    ultimoAviso: null,
  });
  const inicioRef = useRef(Date.now());
  const centroDesdeRef = useRef<number | null>(null);
  const intentosRef = useRef(0);
  const detectandoRef = useRef(false);
  const montadoRef = useRef(false);
  const fallbackActivoRef = useRef(false);
  const camaraListaRef = useRef(false);
  const modelosListosRef = useRef(false);
  const callbacksRef = useRef({ onLoginExitoso, onElegirContraseña });

  callbacksRef.current = { onLoginExitoso, onElegirContraseña };
  camaraListaRef.current = camaraLista;
  modelosListosRef.current = modelosListos;

  const publicarMensaje = useCallback((texto: string) => {
    setMensaje(texto);
    hablar(texto);
  }, []);

  const cambiarFase = useCallback((siguiente: EstadoLoginGuiado) => {
    faseRef.current = siguiente;
    setFase(siguiente);
  }, []);

  const pedirContraseña = useCallback(
    (texto = PREGUNTA_FALLBACK) => {
      if (faseRef.current === 'FALLBACK') return;
      fallbackActivoRef.current = true;
      centroDesdeRef.current = null;
      cambiarFase('FALLBACK');
      FaceSounds.detener();
      publicarMensaje(texto);
    },
    [cambiarFase, publicarMensaje],
  );

  const responderFallback = useCallback(
    (usarContraseña: boolean) => {
      if (faseRef.current !== 'FALLBACK') return;
      if (usarContraseña) {
        callbacksRef.current.onElegirContraseña();
        return;
      }

      intentosRef.current = 0;
      setIntentos(0);
      fallbackActivoRef.current = false;
      inicioRef.current = Date.now();
      centroDesdeRef.current = null;
      estadoGuiaRef.current = { clave: null, ultimoAviso: null };
      setRostroCentrado(false);
      cambiarFase('GUIANDO');
      FaceSounds.iniciar();
      publicarMensaje('Seguimos intentando.');
    },
    [cambiarFase, publicarMensaje],
  );

  useEffect(() => {
    montadoRef.current = true;
    FaceSounds.iniciar();
    return () => {
      montadoRef.current = false;
      FaceSounds.detener();
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    void cargarModelos()
      .then(() => {
        if (cancelado) return;
        modelosListosRef.current = true;
        setModelosListos(true);
      })
      .catch((errorDesconocido: unknown) => {
        if (cancelado) return;
        console.error('No se pudieron cargar los modelos faciales.', errorDesconocido);
        pedirContraseña(
          'No se pudieron cargar los modelos faciales. ¿Querés ingresar con contraseña?',
        );
      });

    return () => {
      cancelado = true;
    };
  }, [pedirContraseña]);

  useEffect(() => {
    if (!error) return;
    pedirContraseña(`${error} ¿Querés ingresar con contraseña?`);
  }, [error, pedirContraseña]);

  const analizarFrame = useCallback(async () => {
    if (
      !montadoRef.current ||
      detectandoRef.current ||
      fallbackActivoRef.current ||
      faseRef.current === 'INGRESANDO'
    ) {
      return;
    }

    if (Date.now() - inicioRef.current >= TIEMPO_LIMITE_MS) {
      pedirContraseña();
      return;
    }

    const video = videoRef.current;
    if (
      !camaraListaRef.current ||
      !modelosListosRef.current ||
      !video ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth <= 0 ||
      video.videoHeight <= 0
    ) {
      return;
    }

    detectandoRef.current = true;
    try {
      const deteccion = await faceapi.detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions(),
      );
      if (!montadoRef.current || fallbackActivoRef.current) return;

      const ahora = Date.now();
      let posicion: PosicionRostro | null = null;
      if (deteccion) {
        const caja = deteccion.box;
        posicion = analizarPosicionRostro(
          { x: caja.x, y: caja.y, width: caja.width, height: caja.height },
          { width: video.videoWidth, height: video.videoHeight },
        );
      }

      const aviso = obtenerAvisoGuia(
        posicion,
        estadoGuiaRef.current,
        ahora,
      );
      estadoGuiaRef.current = aviso.siguienteEstado;
      if (aviso.mensaje) publicarMensaje(aviso.mensaje);

      const centrado =
        posicion !== null &&
        posicion.distancia === 'OK' &&
        posicion.horizontal === 'OK' &&
        posicion.vertical === 'OK';
      setRostroCentrado((actual) => (actual === centrado ? actual : centrado));
      FaceSounds.actualizar(posicion?.cercaniaCentro ?? 0);

      if (!centrado) {
        centroDesdeRef.current = null;
        if (faseRef.current === 'ESTABILIZANDO') cambiarFase('GUIANDO');
        return;
      }

      if (centroDesdeRef.current === null) {
        centroDesdeRef.current = ahora;
        cambiarFase('ESTABILIZANDO');
        return;
      }

      if (ahora - centroDesdeRef.current < TIEMPO_ESTABILIDAD_MS) return;

      cambiarFase('INGRESANDO');
      FaceSounds.detener();
      publicarMensaje('Quedate así... listo, ingresando');

      try {
        const resultadoLogin = await verificarLoginFacial(video);
        if (!montadoRef.current) return;

        let mensajeError: string;
        if (resultadoLogin.tipo === 'rostro-no-detectado') {
          mensajeError = 'No se pudo validar tu rostro. Probá de nuevo.';
        } else if (resultadoLogin.resultado.exito) {
          callbacksRef.current.onLoginExitoso(resultadoLogin.resultado.usuarioId);
          return;
        } else {
          mensajeError = resultadoLogin.resultado.mensaje;
        }
        intentosRef.current += 1;
        setIntentos(intentosRef.current);
        centroDesdeRef.current = null;

        if (intentosRef.current >= MAX_INTENTOS) {
          pedirContraseña();
          return;
        }

        cambiarFase('GUIANDO');
        FaceSounds.iniciar();
        publicarMensaje(mensajeError);
      } catch (errorDesconocido: unknown) {
        console.error('No se pudo completar el login facial guiado.', errorDesconocido);
        pedirContraseña(
          'Ocurrió un error al verificar el rostro. ¿Querés ingresar con contraseña?',
        );
      }
    } catch (errorDesconocido: unknown) {
      if (!montadoRef.current) return;
      console.error('No se pudo analizar el rostro.', errorDesconocido);
      pedirContraseña(
        'Ocurrió un error al analizar el rostro. ¿Querés ingresar con contraseña?',
      );
    } finally {
      detectandoRef.current = false;
    }
  }, [cambiarFase, pedirContraseña, publicarMensaje, videoRef]);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      void analizarFrame();
    }, INTERVALO_ANALISIS_MS);
    return () => window.clearInterval(intervalo);
  }, [analizarFrame]);

  useEffect(() => {
    if (fase !== 'FALLBACK') return;

    const alPresionar = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === 'Space') {
        event.preventDefault();
        responderFallback(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        responderFallback(false);
      }
    };

    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [fase, responderFallback]);

  useEffect(() => {
    if (fase !== 'FALLBACK' || !registrarRespuestaVozFallback) return;
    registrarRespuestaVozFallback(responderFallback);
    return () => registrarRespuestaVozFallback(null);
  }, [fase, registrarRespuestaVozFallback, responderFallback]);

  return (
    <div className="voz-login-guiado">
      <h1 id="voz-login-titulo">Inicio de sesión facial guiado</h1>
      <div
        className={`voz-login-marco${rostroCentrado ? ' voz-login-marco-centrado' : ''}`}
        aria-label={rostroCentrado ? 'Rostro centrado' : 'Alineá tu rostro con la cámara'}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          width={400}
          onLoadedData={alCargarVideo}
        />
      </div>
      <p className="voz-login-mensaje">
        {mensaje}
      </p>
      {intentos > 0 && fase !== 'FALLBACK' && (
        <p>Intentos fallidos: {intentos} de {MAX_INTENTOS}.</p>
      )}
      {fase === 'FALLBACK' && (
        <section
          className="voz-login-fallback"
          role="dialog"
          aria-modal="true"
          aria-labelledby="voz-login-fallback-titulo"
        >
          <h2 id="voz-login-fallback-titulo">{PREGUNTA_FALLBACK}</h2>
          <p>Espacio para ingresar con contraseña. Escape para seguir intentando.</p>
          <Button onClick={() => responderFallback(true)}>
            Sí, ingresar con contraseña
          </Button>
          <Button variant="secondary" onClick={() => responderFallback(false)}>
            No, seguir intentando
          </Button>
        </section>
      )}
      <span className="voz-login-fase" aria-hidden="true">
        {fase === 'INGRESANDO' ? 'Ingresando…' : ''}
      </span>
    </div>
  );
}
