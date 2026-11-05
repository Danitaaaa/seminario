# Tests del módulo de metas

Framework: **Vitest** (igual que el resto de los tests del proceso principal). Desde la raíz del proyecto:

```
npm test                              # todos los tests
npx vitest run src/main/tests/metas   # solo los de metas
```

- `alcance` (`exigirAcceso`, `registrarCambioSiProyecto`, `filtroAlcance`) se mockea en cada test.
- La persistencia es un fake (`utilsTest.ts`) con colas de respuestas para lecturas y para escrituras en transacción.
- Son tests unitarios: no ejecutan SQL real. Para validar las consultas (`copiarMetas`, `estadisticasMetas`,
  `COLUMNAS_META`) conviene sumar tests de integración contra Postgres.
