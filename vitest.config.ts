import { defineConfig } from 'vitest/config';

// Tests unitarios del proceso principal (npm test).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/main/tests/**/*.test.ts'],
  },
});
