import {
    MesSchema, CrearMetaDTOSchema, ListarMetasDTOSchema, ModificarMetaDTOSchema,
    AlternarMetaDTOSchema, EliminarMetaDTOSchema, CopiarMetasDTOSchema, EstadisticasMetasDTOSchema,
} from '../../logicaPersistente/gestionDeMetas/dto';

describe('MesSchema', () => {
    it.each(['2026-01', '2026-09', '2026-10', '2026-12', '1999-06'])('acepta %s', mes => {
        expect(MesSchema.safeParse(mes).success).toBe(true);
    });

    it.each(['2026-00', '2026-13', '2026-1', '26-10', '2026-10-01', '2026/10', '', 'abc', ' 2026-10', '2026-10 '])(
        'rechaza "%s"', mes => {
            expect(MesSchema.safeParse(mes).success).toBe(false);
        });

    it('rechaza valores que no son string', () => {
        expect(MesSchema.safeParse(202610).success).toBe(false);
        expect(MesSchema.safeParse(null).success).toBe(false);
        expect(MesSchema.safeParse(undefined).success).toBe(false);
    });

    it('informa el mensaje de error esperado', () => {
        const r = MesSchema.safeParse('x');
        expect(r.success).toBe(false);
        if (!r.success) expect(r.error.issues[0].message).toBe('Mes inválido, usar AAAA-MM');
    });
});

describe('CrearMetaDTOSchema', () => {
    const base = { idUsuario: 1, titulo: 'Leer', mes: '2026-10' };

    it('acepta una meta personal (sin idProyecto)', () => {
        expect(CrearMetaDTOSchema.parse(base).idProyecto).toBeUndefined();
    });
    it('acepta idProyecto null', () => {
        expect(CrearMetaDTOSchema.parse({ ...base, idProyecto: null }).idProyecto).toBeNull();
    });
    it('acepta idProyecto numérico', () => {
        expect(CrearMetaDTOSchema.parse({ ...base, idProyecto: 5 }).idProyecto).toBe(5);
    });
    it('hace trim del título', () => {
        expect(CrearMetaDTOSchema.parse({ ...base, titulo: '  Hola  ' }).titulo).toBe('Hola');
    });
    it('rechaza título vacío o solo espacios', () => {
        expect(CrearMetaDTOSchema.safeParse({ ...base, titulo: '' }).success).toBe(false);
        expect(CrearMetaDTOSchema.safeParse({ ...base, titulo: '    ' }).success).toBe(false);
    });
    it('acepta título de 200 y rechaza de 201 caracteres', () => {
        expect(CrearMetaDTOSchema.safeParse({ ...base, titulo: 'a'.repeat(200) }).success).toBe(true);
        expect(CrearMetaDTOSchema.safeParse({ ...base, titulo: 'a'.repeat(201) }).success).toBe(false);
    });
    it('acepta descripción null, omitida o de hasta 1000 caracteres', () => {
        expect(CrearMetaDTOSchema.safeParse({ ...base, descripcion: null }).success).toBe(true);
        expect(CrearMetaDTOSchema.safeParse(base).success).toBe(true);
        expect(CrearMetaDTOSchema.safeParse({ ...base, descripcion: 'a'.repeat(1000) }).success).toBe(true);
    });
    it('rechaza descripción de más de 1000 caracteres', () => {
        expect(CrearMetaDTOSchema.safeParse({ ...base, descripcion: 'a'.repeat(1001) }).success).toBe(false);
    });
    it('rechaza idUsuario no entero o faltante', () => {
        expect(CrearMetaDTOSchema.safeParse({ ...base, idUsuario: 1.5 }).success).toBe(false);
        expect(CrearMetaDTOSchema.safeParse({ ...base, idUsuario: '1' }).success).toBe(false);
        const { idUsuario, ...sinUsuario } = base;
        expect(CrearMetaDTOSchema.safeParse(sinUsuario).success).toBe(false);
    });
    it('rechaza idProyecto no entero', () => {
        expect(CrearMetaDTOSchema.safeParse({ ...base, idProyecto: 1.2 }).success).toBe(false);
    });
    it('rechaza mes inválido', () => {
        expect(CrearMetaDTOSchema.safeParse({ ...base, mes: '2026-13' }).success).toBe(false);
    });
});

describe('ListarMetasDTOSchema', () => {
    it('acepta entrada válida con y sin proyecto', () => {
        expect(ListarMetasDTOSchema.safeParse({ idUsuario: 1, mes: '2026-10' }).success).toBe(true);
        expect(ListarMetasDTOSchema.safeParse({ idUsuario: 1, mes: '2026-10', idProyecto: 3 }).success).toBe(true);
    });
    it('rechaza si falta mes o idUsuario', () => {
        expect(ListarMetasDTOSchema.safeParse({ idUsuario: 1 }).success).toBe(false);
        expect(ListarMetasDTOSchema.safeParse({ mes: '2026-10' }).success).toBe(false);
    });
});

describe('ModificarMetaDTOSchema', () => {
    const base = { idMeta: 1, idUsuario: 2 };
    it('acepta sin campos a modificar', () => {
        expect(ModificarMetaDTOSchema.safeParse(base).success).toBe(true);
    });
    it('acepta orden 0 y rechaza negativo o no entero', () => {
        expect(ModificarMetaDTOSchema.safeParse({ ...base, orden: 0 }).success).toBe(true);
        expect(ModificarMetaDTOSchema.safeParse({ ...base, orden: -1 }).success).toBe(false);
        expect(ModificarMetaDTOSchema.safeParse({ ...base, orden: 1.5 }).success).toBe(false);
    });
    it('hace trim del título y rechaza vacío', () => {
        expect(ModificarMetaDTOSchema.parse({ ...base, titulo: ' x ' }).titulo).toBe('x');
        expect(ModificarMetaDTOSchema.safeParse({ ...base, titulo: '  ' }).success).toBe(false);
    });
    it('permite descripción null (para borrarla)', () => {
        expect(ModificarMetaDTOSchema.parse({ ...base, descripcion: null }).descripcion).toBeNull();
    });
    it('rechaza idMeta faltante', () => {
        expect(ModificarMetaDTOSchema.safeParse({ idUsuario: 2 }).success).toBe(false);
    });
});

describe('AlternarMetaDTOSchema', () => {
    it('`completada` es opcional', () => {
        expect(AlternarMetaDTOSchema.parse({ idMeta: 1, idUsuario: 1 }).completada).toBeUndefined();
    });
    it('acepta true y false', () => {
        expect(AlternarMetaDTOSchema.parse({ idMeta: 1, idUsuario: 1, completada: false }).completada).toBe(false);
        expect(AlternarMetaDTOSchema.parse({ idMeta: 1, idUsuario: 1, completada: true }).completada).toBe(true);
    });
    it('rechaza `completada` no booleano', () => {
        expect(AlternarMetaDTOSchema.safeParse({ idMeta: 1, idUsuario: 1, completada: 'si' }).success).toBe(false);
    });
});

describe('EliminarMetaDTOSchema', () => {
    it('acepta entrada válida', () => {
        expect(EliminarMetaDTOSchema.safeParse({ idMeta: 1, idUsuario: 1 }).success).toBe(true);
    });
    it('rechaza ids faltantes o no enteros', () => {
        expect(EliminarMetaDTOSchema.safeParse({ idUsuario: 1 }).success).toBe(false);
        expect(EliminarMetaDTOSchema.safeParse({ idMeta: 1.5, idUsuario: 1 }).success).toBe(false);
    });
});

describe('CopiarMetasDTOSchema', () => {
    const base = { idUsuario: 1, mesOrigen: '2026-09', mesDestino: '2026-10' };
    it('soloPendientes es true por defecto', () => {
        expect(CopiarMetasDTOSchema.parse(base).soloPendientes).toBe(true);
    });
    it('respeta soloPendientes=false', () => {
        expect(CopiarMetasDTOSchema.parse({ ...base, soloPendientes: false }).soloPendientes).toBe(false);
    });
    it('rechaza meses inválidos', () => {
        expect(CopiarMetasDTOSchema.safeParse({ ...base, mesOrigen: '2026-9' }).success).toBe(false);
        expect(CopiarMetasDTOSchema.safeParse({ ...base, mesDestino: 'x' }).success).toBe(false);
    });
    it('rechaza si faltan meses', () => {
        expect(CopiarMetasDTOSchema.safeParse({ idUsuario: 1, mesOrigen: '2026-09' }).success).toBe(false);
    });
});

describe('EstadisticasMetasDTOSchema', () => {
    it('desde y hasta son opcionales', () => {
        expect(EstadisticasMetasDTOSchema.safeParse({ idUsuario: 1 }).success).toBe(true);
    });
    it('valida el formato de desde y hasta', () => {
        expect(EstadisticasMetasDTOSchema.safeParse({ idUsuario: 1, desde: '2026-01', hasta: '2026-12' }).success).toBe(true);
        expect(EstadisticasMetasDTOSchema.safeParse({ idUsuario: 1, desde: '2026-00' }).success).toBe(false);
        expect(EstadisticasMetasDTOSchema.safeParse({ idUsuario: 1, hasta: 'hoy' }).success).toBe(false);
    });
});
