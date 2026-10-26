import { ipcMain } from 'electron';
import { RepeticionEspaciada } from '../administracionDePersistencia/repeticionEspaciada';
import { registrarRevisionSchema, guardarRepeticionMaterialSchema } from '../logicaPersistente/gestionDeRepeticionEspaciada/dto';

function validarUsuarioId(usuarioId: unknown): asserts usuarioId is number {
    if (typeof usuarioId !== 'number' || !Number.isInteger(usuarioId) || usuarioId <= 0) {
        throw new Error('El identificador de usuario no es válido.');
    }
}

export function registerRepeticionEspaciadaIpc(repeticion: RepeticionEspaciada): void {
    ipcMain.handle('repeticionEspaciada:listarFlashcards', async (_event, usuarioId: unknown) => {
        validarUsuarioId(usuarioId);
        return repeticion.listarFlashcardsPendientes(usuarioId);
    });

    ipcMain.handle('repeticionEspaciada:registrarRevision', async (_event, datos: unknown) =>
        repeticion.registrarRevision(registrarRevisionSchema.parse(datos))
    );

    ipcMain.handle('repeticionEspaciada:listarMaterial', async (_event, usuarioId: unknown) => {
        validarUsuarioId(usuarioId);
        return repeticion.listarMaterial(usuarioId);
    });

    ipcMain.handle('repeticionEspaciada:guardarMaterial', async (_event, datos: unknown) =>
        repeticion.guardarMaterial(guardarRepeticionMaterialSchema.parse(datos))
    );
}
