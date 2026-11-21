import { Menu, type MenuItemConstructorOptions, type WebContents } from 'electron';

// Idiomas del corrector, en orden de preferencia. Solo se activan los que la compu tiene.
const IDIOMAS = ['es-AR', 'es-419', 'es-ES', 'es', 'en-US'];

// Menú del clic derecho: sugerencias para la palabra marcada en rojo, "Agregar al diccionario"
// y cortar / copiar / pegar. Electron no trae ninguno armado.
export function activarMenuContextual(contenidos: WebContents): void {
  const sesion = contenidos.session;
  try {
    const disponibles = sesion.availableSpellCheckerLanguages;
    const elegidos = IDIOMAS.filter((idioma) => disponibles.includes(idioma));
    // En Windows y macOS usa el corrector del sistema y esta lista se ignora; en Linux baja el diccionario.
    if (elegidos.length) sesion.setSpellCheckerLanguages(elegidos);
  } catch (error) {
    console.error('[Corrector] No se pudieron elegir los idiomas:', error);
  }

  contenidos.on('context-menu', (_evento, datos) => {
    const opciones: MenuItemConstructorOptions[] = [];

    if (datos.misspelledWord) {
      for (const sugerencia of datos.dictionarySuggestions.slice(0, 5)) {
        opciones.push({ label: sugerencia, click: () => contenidos.replaceMisspelling(sugerencia) });
      }
      if (datos.dictionarySuggestions.length === 0) opciones.push({ label: 'Sin sugerencias', enabled: false });
      opciones.push({
        label: 'Agregar al diccionario',
        click: () => sesion.addWordToSpellCheckerDictionary(datos.misspelledWord),
      });
      opciones.push({ type: 'separator' });
    }

    const { editFlags, isEditable, selectionText } = datos;
    if (isEditable) {
      opciones.push(
        { label: 'Cortar', role: 'cut', accelerator: 'CmdOrCtrl+X', enabled: editFlags.canCut },
        { label: 'Copiar', role: 'copy', accelerator: 'CmdOrCtrl+C', enabled: editFlags.canCopy },
        { label: 'Pegar', role: 'paste', accelerator: 'CmdOrCtrl+V', enabled: editFlags.canPaste },
        { type: 'separator' },
        { label: 'Seleccionar todo', role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
      );
    } else if (selectionText.trim()) {
      opciones.push({ label: 'Copiar', role: 'copy', accelerator: 'CmdOrCtrl+C' });
    }

    if (opciones.length) Menu.buildFromTemplate(opciones).popup();
  });
}
