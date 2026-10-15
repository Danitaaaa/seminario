import { useMemo, useState } from 'react';
import type { MouseEvent, KeyboardEvent } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface VisorPdfProps {
  contenido: Uint8Array;
  onGuardar: (bytes: Uint8Array) => Promise<void>;
}

const ANCHO_PAGINA = 760;
const TAMANIO_TEXTO = 12; // en puntos del PDF

type Borrador = { x: number; y: number; texto: string };

// Muestra el PDF con react-pdf y lo edita con pdf-lib: rotar, eliminar páginas y escribir texto sobre la página.
export function VisorPdf({ contenido, onGuardar }: VisorPdfProps) {
  const [bytes, setBytes] = useState(contenido);
  const [paginas, setPaginas] = useState(0);
  const [actual, setActual] = useState(1);
  const [modoTexto, setModoTexto] = useState(false);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [escala, setEscala] = useState(1); // píxeles en pantalla por punto del PDF
  const [modificado, setModificado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // pdf.js se queda con el buffer que recibe, por eso se le pasa una copia.
  const archivo = useMemo(() => ({ data: bytes.slice() }), [bytes]);

  const editar = async (cambio: (pdf: PDFDocument) => Promise<void> | void) => {
    try {
      const pdf = await PDFDocument.load(bytes);
      await cambio(pdf);
      setBytes(await pdf.save());
      setModificado(true);
    } catch {
      setError('No se pudo aplicar el cambio (puede que el texto tenga caracteres no soportados).');
    }
  };

  const rotar = () =>
    editar((pdf) => {
      const pagina = pdf.getPage(actual - 1);
      pagina.setRotation(degrees((pagina.getRotation().angle + 90) % 360));
    });

  const eliminarPagina = () => {
    if (paginas <= 1) return;
    if (!confirm(`¿Eliminar la página ${actual}?`)) return;
    editar((pdf) => pdf.removePage(actual - 1));
    setActual((a) => Math.max(1, a - 1));
  };

  // Con la herramienta de texto activa, un clic abre un campo en ese punto para escribir.
  const clicEnPagina = (evento: MouseEvent<HTMLDivElement>) => {
    if (!modoTexto || borrador) return;
    const caja = evento.currentTarget.getBoundingClientRect();
    setBorrador({ x: evento.clientX - caja.left, y: evento.clientY - caja.top, texto: '' });
  };

  // Pasa lo escrito al PDF, convirtiendo la posición en pantalla a puntos del PDF.
  const confirmarTexto = () => {
    if (!borrador) return;
    const { x, y, texto } = borrador;
    setBorrador(null);
    if (!texto.trim()) return;

    editar(async (pdf) => {
      const pagina = pdf.getPage(actual - 1);
      const { height } = pagina.getSize();
      const fuente = await pdf.embedFont(StandardFonts.Helvetica);
      pagina.drawText(texto, {
        x: x / escala,
        y: height - y / escala - TAMANIO_TEXTO, // drawText ubica la base de la letra, no el borde superior
        size: TAMANIO_TEXTO,
        font: fuente,
        color: rgb(0, 0, 0),
      });
    });
  };

  const teclaEnCampo = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'Enter') confirmarTexto();
    if (evento.key === 'Escape') setBorrador(null);
  };

  const guardar = async () => {
    await onGuardar(bytes);
    setModificado(false);
  };

  return (
    <div className="visor-pdf">
      <div className="visor__barra">
        <button className="visor-boton visor-boton--contorno" disabled={actual <= 1} onClick={() => setActual((a) => a - 1)}>◀</button>
        <span>Página {actual} de {paginas}</span>
        <button className="visor-boton visor-boton--contorno" disabled={actual >= paginas} onClick={() => setActual((a) => a + 1)}>▶</button>
        <span className="visor__separador" />
        <button
          className={`visor-boton ${modoTexto ? '' : 'visor-boton--contorno'}`}
          title="Escribir texto sobre la página"
          onClick={() => {
            setModoTexto((v) => !v);
            setBorrador(null);
          }}
        >
          T
        </button>
        <button className="visor-boton visor-boton--contorno" onClick={rotar}>Rotar</button>
        <button className="visor-boton visor-boton--contorno" disabled={paginas <= 1} onClick={eliminarPagina}>Eliminar página</button>
        <button className="visor-boton" disabled={!modificado} onClick={guardar}>Guardar</button>
      </div>

      {error && <p className="visor__nota" onClick={() => setError(null)}>{error}</p>}

      <div className="visor-pdf__documento">
        <Document
          file={archivo}
          onLoadSuccess={({ numPages }) => {
            setPaginas(numPages);
            setActual((a) => Math.min(a, numPages));
          }}
          loading={<p className="visor__cargando">Cargando PDF…</p>}
          error={<p className="visor__cargando">No se pudo leer el PDF.</p>}
        >
          <div
            className={modoTexto ? 'visor-pdf__pagina visor-pdf__pagina--texto' : 'visor-pdf__pagina'}
            onClick={clicEnPagina}
          >
            <Page
              pageNumber={actual}
              width={ANCHO_PAGINA}
              renderTextLayer={!modoTexto}
              onLoadSuccess={(pagina) => setEscala(ANCHO_PAGINA / pagina.originalWidth)}
            />
            {borrador && (
              <input
                className="visor-pdf__campo"
                style={{ left: borrador.x, top: borrador.y, fontSize: TAMANIO_TEXTO * escala }}
                value={borrador.texto}
                autoFocus
                placeholder="Escribí acá…"
                onChange={(e) => setBorrador({ ...borrador, texto: e.target.value })}
                onKeyDown={teclaEnCampo}
                onBlur={confirmarTexto}
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </Document>
      </div>
    </div>
  );
}