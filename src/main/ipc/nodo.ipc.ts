import { ipcMain } from 'electron';
import { Nodos } from '../administracionDePersistencia/nodo';
import {
    CrearNodoDTOSchema,
    ModificarNodoDTOSchema,
    BuscarNodosDTOSchema,
    EliminarNodoDTOSchema,
    MoverNodoDTOSchema,
} from '../logicaPersistente/gestionMaterialEstudio/dto';

export function registrarNodosIpc(nodos: Nodos): void {
    ipcMain.handle('nodos:crear', async (_event, datos: unknown) => {
        const validado = CrearNodoDTOSchema.parse(datos);
        return nodos.crear(validado);
    });

    ipcMain.handle('nodos:modificar', async (_event, datos: unknown) => {
        const validado = ModificarNodoDTOSchema.parse(datos);
        return nodos.modificar(validado);
    });

    ipcMain.handle('nodos:buscar', async (_event, criterios: unknown) => {
        const validado = BuscarNodosDTOSchema.parse(criterios);
        return nodos.buscar(validado);
    });

    ipcMain.handle('nodos:mover', async (_event, datos: unknown) => {
        const validado = MoverNodoDTOSchema.parse(datos);
        return nodos.mover(validado);
    });

    ipcMain.handle('nodos:eliminar', async (_event, datos: unknown) => {
        const validado = EliminarNodoDTOSchema.parse(datos);
        return nodos.eliminar(validado);
    });
}