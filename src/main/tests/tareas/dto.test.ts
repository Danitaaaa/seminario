import {
    FechaSchema,
    PrioridadSchema,
    CrearTareaDTOSchema,
    ListarTareasDTOSchema,
    ModificarTareaDTOSchema,
    AlternarTareaDTOSchema,
    AsignarTareaDTOSchema,
    RepartirTareasDTOSchema,
    EliminarTareaDTOSchema,
} from '../../logicaPersistente/gestionDeTareas/dto';

describe('PrioridadSchema', () => {
    it.each(['alta', 'media', 'baja'])('acepta "%s"', p => {
        expect(PrioridadSchema.parse(p)).toBe(p);
    });
    it.each(['urgente', '', 'ALTA', null, 1])('rechaza %p', p => {
        expect(PrioridadSchema.safeParse(p).success).toBe(false);
    });
});

describe('FechaSchema', () => {
    it.each(['2026-10-28', '2024-02-29', '2000-02-29', '2026-12-31', '2026-01-01'])('acepta %s', f => {
        expect(FechaSchema.parse(f)).toBe(f);
    });
    it.each([
        ['2025-02-29', 'año no bisiesto'],
        ['1900-02-29', 'siglo no bisiesto'],
        ['2026-02-30', 'día inexistente'],
        ['2026-04-31', 'abril tiene 30 días'],
        ['2026-13-01', 'mes 13'],
        ['2026-00-10', 'mes 0'],
        ['2026-01-00', 'día 0'],
        ['2026-1-1', 'sin ceros'],
        ['28-10-2026', 'formato DD-MM-AAAA'],
        ['2026/10/28', 'separador distinto'],
        ['2026-10-28T00:00:00Z', 'con hora'],
        [' 2026-10-28', 'espacio inicial'],
        ['', 'vacío'],
    ])('rechaza %s (%s)', f => {
        expect(FechaSchema.safeParse(f).success).toBe(false);
    });
    it('rechaza valores que no son texto', () => {
        expect(FechaSchema.safeParse(new Date()).success).toBe(false);
        expect(FechaSchema.safeParse(20261028).success).toBe(false);
    });
});

describe('CrearTareaDTOSchema', () => {
    const base = { idUsuario: 1, titulo: 'Hacer algo' };

    it('aplica prioridad "media" por defecto', () => {
        expect(CrearTareaDTOSchema.parse(base).prioridad).toBe('media');
    });
    it('acepta el mínimo (tarea personal)', () => {
        const r = CrearTareaDTOSchema.parse(base);
        expect(r.idProyecto).toBeUndefined();
        expect(r.idAsignadoGlobal).toBeUndefined();
    });
    it('acepta todos los campos', () => {
        const r = CrearTareaDTOSchema.parse({
            ...base, idProyecto: 3, descripcion: 'd', prioridad: 'alta', fechaLimite: '2026-12-01', idAsignadoGlobal: 7,
        });
        expect(r).toMatchObject({ idProyecto: 3, descripcion: 'd', prioridad: 'alta', fechaLimite: '2026-12-01', idAsignadoGlobal: 7 });
    });
    it('acepta null en idProyecto, descripcion, fechaLimite e idAsignadoGlobal', () => {
        expect(CrearTareaDTOSchema.safeParse({
            ...base, idProyecto: null, descripcion: null, fechaLimite: null, idAsignadoGlobal: null,
        }).success).toBe(true);
    });
    it('conserva idAsignadoGlobal null (tarea sin asignar) y no lo reemplaza', () => {
        expect(CrearTareaDTOSchema.parse({ ...base, idProyecto: 3, idAsignadoGlobal: null }).idAsignadoGlobal).toBeNull();
    });
    it('recorta espacios del título', () => {
        expect(CrearTareaDTOSchema.parse({ ...base, titulo: '  hola  ' }).titulo).toBe('hola');
    });
    it('rechaza título vacío o solo espacios', () => {
        expect(CrearTareaDTOSchema.safeParse({ ...base, titulo: '' }).success).toBe(false);
        expect(CrearTareaDTOSchema.safeParse({ ...base, titulo: '    ' }).success).toBe(false);
    });
    it('rechaza título que no es texto', () => {
        expect(CrearTareaDTOSchema.safeParse({ ...base, titulo: 5 }).success).toBe(false);
        expect(CrearTareaDTOSchema.safeParse({ ...base, titulo: null }).success).toBe(false);
    });
    it('título: 200 caracteres sí, 201 no', () => {
        expect(CrearTareaDTOSchema.safeParse({ ...base, titulo: 'a'.repeat(200) }).success).toBe(true);
        expect(CrearTareaDTOSchema.safeParse({ ...base, titulo: 'a'.repeat(201) }).success).toBe(false);
    });
    it('descripción: 1000 caracteres sí, 1001 no', () => {
        expect(CrearTareaDTOSchema.safeParse({ ...base, descripcion: 'a'.repeat(1000) }).success).toBe(true);
        expect(CrearTareaDTOSchema.safeParse({ ...base, descripcion: 'a'.repeat(1001) }).success).toBe(false);
    });
    it('rechaza falta de idUsuario o título', () => {
        expect(CrearTareaDTOSchema.safeParse({ titulo: 'x' }).success).toBe(false);
        expect(CrearTareaDTOSchema.safeParse({ idUsuario: 1 }).success).toBe(false);
    });
    it('rechaza ids no enteros o de otro tipo', () => {
        expect(CrearTareaDTOSchema.safeParse({ ...base, idUsuario: 1.5 }).success).toBe(false);
        expect(CrearTareaDTOSchema.safeParse({ ...base, idUsuario: '1' }).success).toBe(false);
        expect(CrearTareaDTOSchema.safeParse({ ...base, idProyecto: 2.2 }).success).toBe(false);
        expect(CrearTareaDTOSchema.safeParse({ ...base, idAsignadoGlobal: 'x' }).success).toBe(false);
        expect(CrearTareaDTOSchema.safeParse({ ...base, idAsignadoGlobal: 1.5 }).success).toBe(false);
    });
    it('rechaza prioridad y fecha inválidas', () => {
        expect(CrearTareaDTOSchema.safeParse({ ...base, prioridad: 'x' }).success).toBe(false);
        expect(CrearTareaDTOSchema.safeParse({ ...base, fechaLimite: '2026-02-30' }).success).toBe(false);
    });
});

describe('ListarTareasDTOSchema', () => {
    it('acepta con y sin proyecto', () => {
        expect(ListarTareasDTOSchema.safeParse({ idUsuario: 1 }).success).toBe(true);
        expect(ListarTareasDTOSchema.safeParse({ idUsuario: 1, idProyecto: null }).success).toBe(true);
        expect(ListarTareasDTOSchema.safeParse({ idUsuario: 1, idProyecto: 4 }).success).toBe(true);
    });
    it('exige idUsuario entero', () => {
        expect(ListarTareasDTOSchema.safeParse({}).success).toBe(false);
        expect(ListarTareasDTOSchema.safeParse({ idUsuario: 'a' }).success).toBe(false);
        expect(ListarTareasDTOSchema.safeParse({ idUsuario: 1.5 }).success).toBe(false);
    });
    it('rechaza idProyecto no entero', () => {
        expect(ListarTareasDTOSchema.safeParse({ idUsuario: 1, idProyecto: 2.5 }).success).toBe(false);
        expect(ListarTareasDTOSchema.safeParse({ idUsuario: 1, idProyecto: '4' }).success).toBe(false);
    });
});

describe('ModificarTareaDTOSchema', () => {
    const base = { idTarea: 1, idUsuario: 2 };

    it('todos los campos editables son opcionales', () => {
        expect(ModificarTareaDTOSchema.safeParse(base).success).toBe(true);
    });
    it('acepta todos los campos editables', () => {
        const r = ModificarTareaDTOSchema.parse({
            ...base, titulo: 'T', descripcion: 'd', prioridad: 'baja', fechaLimite: '2026-12-01',
        });
        expect(r).toMatchObject({ titulo: 'T', descripcion: 'd', prioridad: 'baja', fechaLimite: '2026-12-01' });
    });
    it('null en descripcion y fechaLimite se conserva (borra el valor)', () => {
        const r = ModificarTareaDTOSchema.parse({ ...base, descripcion: null, fechaLimite: null });
        expect(r.descripcion).toBeNull();
        expect(r.fechaLimite).toBeNull();
    });
    it('un campo no enviado queda undefined (no se modifica)', () => {
        const r = ModificarTareaDTOSchema.parse({ ...base, titulo: 'T' });
        expect(r.descripcion).toBeUndefined();
        expect(r.fechaLimite).toBeUndefined();
        expect(r.prioridad).toBeUndefined();
    });
    it('no admite título null ni vacío', () => {
        expect(ModificarTareaDTOSchema.safeParse({ ...base, titulo: null }).success).toBe(false);
        expect(ModificarTareaDTOSchema.safeParse({ ...base, titulo: ' ' }).success).toBe(false);
    });
    it('recorta espacios del título', () => {
        expect(ModificarTareaDTOSchema.parse({ ...base, titulo: '  hola  ' }).titulo).toBe('hola');
    });
    it('título: 200 caracteres sí, 201 no', () => {
        expect(ModificarTareaDTOSchema.safeParse({ ...base, titulo: 'a'.repeat(200) }).success).toBe(true);
        expect(ModificarTareaDTOSchema.safeParse({ ...base, titulo: 'a'.repeat(201) }).success).toBe(false);
    });
    it('descripción: 1000 caracteres sí, 1001 no', () => {
        expect(ModificarTareaDTOSchema.safeParse({ ...base, descripcion: 'a'.repeat(1000) }).success).toBe(true);
        expect(ModificarTareaDTOSchema.safeParse({ ...base, descripcion: 'a'.repeat(1001) }).success).toBe(false);
    });
    it('no admite prioridad null ni inválida', () => {
        expect(ModificarTareaDTOSchema.safeParse({ ...base, prioridad: null }).success).toBe(false);
        expect(ModificarTareaDTOSchema.safeParse({ ...base, prioridad: 'x' }).success).toBe(false);
    });
    it.each(['alta', 'media', 'baja'])('acepta prioridad "%s"', p => {
        expect(ModificarTareaDTOSchema.safeParse({ ...base, prioridad: p }).success).toBe(true);
    });
    it('rechaza fecha límite inválida', () => {
        expect(ModificarTareaDTOSchema.safeParse({ ...base, fechaLimite: '2026-02-30' }).success).toBe(false);
        expect(ModificarTareaDTOSchema.safeParse({ ...base, fechaLimite: '28-10-2026' }).success).toBe(false);
    });
    it('exige idTarea e idUsuario', () => {
        expect(ModificarTareaDTOSchema.safeParse({ idUsuario: 1 }).success).toBe(false);
        expect(ModificarTareaDTOSchema.safeParse({ idTarea: 1 }).success).toBe(false);
    });
    it('rechaza ids no enteros', () => {
        expect(ModificarTareaDTOSchema.safeParse({ idTarea: 1.5, idUsuario: 1 }).success).toBe(false);
        expect(ModificarTareaDTOSchema.safeParse({ idTarea: 1, idUsuario: '1' }).success).toBe(false);
    });
});

describe('AlternarTareaDTOSchema', () => {
    it('completada es opcional y booleana', () => {
        expect(AlternarTareaDTOSchema.safeParse({ idTarea: 1, idUsuario: 1 }).success).toBe(true);
        expect(AlternarTareaDTOSchema.safeParse({ idTarea: 1, idUsuario: 1, completada: true }).success).toBe(true);
        expect(AlternarTareaDTOSchema.safeParse({ idTarea: 1, idUsuario: 1, completada: false }).success).toBe(true);
        expect(AlternarTareaDTOSchema.safeParse({ idTarea: 1, idUsuario: 1, completada: 'si' }).success).toBe(false);
    });
    it('exige idTarea e idUsuario enteros', () => {
        expect(AlternarTareaDTOSchema.safeParse({ idUsuario: 1 }).success).toBe(false);
        expect(AlternarTareaDTOSchema.safeParse({ idTarea: 1 }).success).toBe(false);
        expect(AlternarTareaDTOSchema.safeParse({ idTarea: 1.5, idUsuario: 1 }).success).toBe(false);
    });
});

describe('AsignarTareaDTOSchema', () => {
    it('idAsignadoGlobal puede ser entero o null', () => {
        expect(AsignarTareaDTOSchema.safeParse({ idTarea: 1, idUsuario: 1, idAsignadoGlobal: 3 }).success).toBe(true);
        expect(AsignarTareaDTOSchema.safeParse({ idTarea: 1, idUsuario: 1, idAsignadoGlobal: null }).success).toBe(true);
    });
    it('idAsignadoGlobal es obligatorio (undefined no vale)', () => {
        expect(AsignarTareaDTOSchema.safeParse({ idTarea: 1, idUsuario: 1 }).success).toBe(false);
    });
    it('idAsignadoGlobal debe ser entero', () => {
        expect(AsignarTareaDTOSchema.safeParse({ idTarea: 1, idUsuario: 1, idAsignadoGlobal: 'x' }).success).toBe(false);
        expect(AsignarTareaDTOSchema.safeParse({ idTarea: 1, idUsuario: 1, idAsignadoGlobal: 1.5 }).success).toBe(false);
    });
    it('exige idTarea e idUsuario', () => {
        expect(AsignarTareaDTOSchema.safeParse({ idUsuario: 1, idAsignadoGlobal: 3 }).success).toBe(false);
        expect(AsignarTareaDTOSchema.safeParse({ idTarea: 1, idAsignadoGlobal: 3 }).success).toBe(false);
    });
});

describe('RepartirTareasDTOSchema', () => {
    it('exige idProyecto e idUsuario', () => {
        expect(RepartirTareasDTOSchema.safeParse({ idProyecto: 1, idUsuario: 1 }).success).toBe(true);
        expect(RepartirTareasDTOSchema.safeParse({ idUsuario: 1 }).success).toBe(false);
        expect(RepartirTareasDTOSchema.safeParse({ idProyecto: null, idUsuario: 1 }).success).toBe(false);
        expect(RepartirTareasDTOSchema.safeParse({ idProyecto: 1 }).success).toBe(false);
    });
    it('rechaza ids no enteros', () => {
        expect(RepartirTareasDTOSchema.safeParse({ idProyecto: 1.5, idUsuario: 1 }).success).toBe(false);
        expect(RepartirTareasDTOSchema.safeParse({ idProyecto: 1, idUsuario: '1' }).success).toBe(false);
    });
});

describe('EliminarTareaDTOSchema', () => {
    it('exige idTarea e idUsuario enteros', () => {
        expect(EliminarTareaDTOSchema.safeParse({ idTarea: 1, idUsuario: 1 }).success).toBe(true);
        expect(EliminarTareaDTOSchema.safeParse({ idTarea: 1 }).success).toBe(false);
        expect(EliminarTareaDTOSchema.safeParse({ idUsuario: 1 }).success).toBe(false);
        expect(EliminarTareaDTOSchema.safeParse({ idTarea: 1.1, idUsuario: 1 }).success).toBe(false);
        expect(EliminarTareaDTOSchema.safeParse({ idTarea: 1, idUsuario: '1' }).success).toBe(false);
    });
});