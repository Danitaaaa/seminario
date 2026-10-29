# Tests del módulo de metas

Framework: **Jest + ts-jest**. Copiar los archivos `*.test.ts` y `utilsTest.ts` junto al código del módulo
(mismo directorio que `crearMeta.ts`, etc.), de modo que `../gestionDeProyectos/alcance` resuelva igual que en el código.

```
npm i -D jest ts-jest @types/jest
npx ts-jest config:init
npx jest
```

- `alcance` (`exigirAcceso`, `registrarCambioSiProyecto`, `filtroAlcance`) se mockea en cada test.
- La persistencia es un fake (`utilsTest.ts`) con colas de respuestas para lecturas y para escrituras en transacción.
- Si usás Vitest: reemplazar `jest.` por `vi.` e importar `vi` de `vitest`.
- Son tests unitarios: no ejecutan SQL real. Para validar las consultas (`copiarMetas`, `estadisticasMetas`,
  `COLUMNAS_META`) conviene sumar tests de integración contra Postgres.
