import { obtenerFilaMeta } from '../../logicaPersistente/gestionDeMetas/buscarMeta';
import { COLUMNAS_META } from '../../logicaPersistente/gestionDeMetas/materializador';
import { crearPersistenciaFalsa, filaMeta } from './utilsTest';

describe('obtenerFilaMeta', () => {
    it('devuelve la fila encontrada', async () => {
        const fila = filaMeta({ id_meta: 42 });
        const { persistencia } = crearPersistenciaFalsa([[fila]]);
        await expect(obtenerFilaMeta(persistencia, 42)).resolves.toBe(fila);
    });

    it('consulta por id_meta con parámetro y las columnas estándar', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaMeta()]]);
        await obtenerFilaMeta(persistencia, 42);
        expect(ejecutar).toHaveBeenCalledTimes(1);
        const [sql, valores] = ejecutar.mock.calls[0];
        expect(sql).toContain(COLUMNAS_META);
        expect(sql).toContain('FROM metas WHERE id_meta = $1');
        expect(valores).toEqual([42]);
    });

    it('lanza "Meta inexistente" si no hay filas', async () => {
        const { persistencia } = crearPersistenciaFalsa([[]]);
        await expect(obtenerFilaMeta(persistencia, 99)).rejects.toThrow('Meta inexistente');
    });

    it('propaga errores de la persistencia', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa();
        ejecutar.mockRejectedValueOnce(new Error('BD caída'));
        await expect(obtenerFilaMeta(persistencia, 1)).rejects.toThrow('BD caída');
    });
});
