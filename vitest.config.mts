import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    clearMocks: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
