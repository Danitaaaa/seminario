import { useEffect, useState } from 'react';
import ExcelJS from 'exceljs';
import Spreadsheet from 'react-spreadsheet';
import type { Matrix, CellBase } from 'react-spreadsheet';

interface VisorExcelProps {
  contenido: Uint8Array;
  onGuardar: (bytes: Uint8Array) => Promise<void>;
}

type Celda = CellBase<string>;

const FILAS_MINIMAS = 20;
const COLUMNAS_MINIMAS = 8;

// Texto que se muestra en la grilla: el resultado si es fórmula, el valor si no.
function textoCelda(celda: ExcelJS.Cell): string {
  const v = celda.value;
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toLocaleDateString('es-AR');
  if (typeof v === 'object') {
    if ('formula' in v || 'sharedFormula' in v) return String((v as ExcelJS.CellFormulaValue).result ?? '');
    if ('richText' in v) return v.richText.map((t) => t.text).join('');
    if ('text' in v) return String(v.text);
    if ('error' in v) return String(v.error);
  }
  return String(v);
}

function aMatriz(hoja: ExcelJS.Worksheet): Matrix<Celda> {
  const filas = Math.max(hoja.rowCount, FILAS_MINIMAS);
  const columnas = Math.max(hoja.columnCount, COLUMNAS_MINIMAS);
  return Array.from({ length: filas }, (_, f) =>
    Array.from({ length: columnas }, (_, c) => ({ value: textoCelda(hoja.getCell(f + 1, c + 1)) }))
  );
}

// Interpreta lo que escribió el usuario: fórmula si empieza con "=", número si parece número, texto si no.
function valorExcel(texto: string): ExcelJS.CellValue {
  if (texto === '') return null;
  if (texto.startsWith('=')) return { formula: texto.slice(1) } as ExcelJS.CellFormulaValue;
  const numero = Number(texto.replace(',', '.'));
  return texto.trim() !== '' && !Number.isNaN(numero) ? numero : texto;
}

// Lee la planilla con ExcelJS y la muestra en react-spreadsheet. Al guardar solo toca las celdas cambiadas,
// así se conservan estilos y fórmulas del resto.
export function VisorExcel({ contenido, onGuardar }: VisorExcelProps) {
  const [libro, setLibro] = useState<ExcelJS.Workbook | null>(null);
  const [indiceHoja, setIndiceHoja] = useState(0);
  const [originales, setOriginales] = useState<Matrix<Celda>[]>([]);
  const [datos, setDatos] = useState<Matrix<Celda>[]>([]);
  const [modificado, setModificado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const wb = new ExcelJS.Workbook();
    const buffer = contenido.buffer.slice(contenido.byteOffset, contenido.byteOffset + contenido.byteLength) as ArrayBuffer;
    wb.xlsx
      .load(buffer)
      .then(() => {
        const matrices = wb.worksheets.map(aMatriz);
        setLibro(wb);
        setOriginales(matrices);
        setDatos(matrices);
      })
      .catch(() => setError('No se pudo leer la planilla.'));
  }, [contenido]);

  const cambiar = (nueva: Matrix<Celda>) => {
    setDatos((prev) => prev.map((m, i) => (i === indiceHoja ? nueva : m)));
    setModificado(true);
  };

  const guardar = async () => {
    if (!libro) return;
    libro.worksheets.forEach((hoja, h) => {
      datos[h].forEach((fila, f) =>
        fila.forEach((celda, c) => {
          const nuevo = celda?.value ?? '';
          const anterior = originales[h][f]?.[c]?.value ?? '';
          if (nuevo !== anterior) hoja.getCell(f + 1, c + 1).value = valorExcel(nuevo);
        })
      );
    });
    const buffer = await libro.xlsx.writeBuffer();
    await onGuardar(new Uint8Array(buffer as ArrayBuffer));
    setOriginales(datos);
    setModificado(false);
  };

  if (error) return <p className="visor__cargando">{error}</p>;
  if (!libro) return <p className="visor__cargando">Cargando planilla…</p>;

  return (
    <div className="visor-excel">
      <div className="visor__barra">
        {libro.worksheets.map((hoja, i) => (
          <button
            key={hoja.id}
            className={`visor-boton ${i === indiceHoja ? '' : 'visor-boton--contorno'}`}
            onClick={() => setIndiceHoja(i)}
          >
            {hoja.name}
          </button>
        ))}
        <span className="visor__separador" />
        <button className="visor-boton" disabled={!modificado} onClick={guardar}>Guardar</button>
      </div>
      <p className="visor__nota">Las fórmulas se muestran con su último resultado. Para escribir una fórmula empezá con "=".</p>
      <div className="visor-excel__grilla">
        {datos[indiceHoja] && <Spreadsheet data={datos[indiceHoja]} onChange={cambiar} />}
      </div>
    </div>
  );
}