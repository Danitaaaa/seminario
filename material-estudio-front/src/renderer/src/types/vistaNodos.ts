// Mismos valores que BuscarNodosDTOSchema en el backend (dto.ts), para que conectar
// esta UI con la búsqueda real sea directo: el string que viaja acá es el mismo
// que espera el DTO, no hace falta traducir nada al integrar.
export type OrdenarPor =
    | 'nombre'
    | 'fecha_carga'
    | 'fecha_ultimo_acceso'
    | 'fecha_ultima_modificacion'
    | 'tamaño';

export type Direccion = 'ASC' | 'DESC';

export type VistaListado = 'cuadricula' | 'lista';
