import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    env: {
      TWENTY_API_URL: 'http://localhost:3001',
      TWENTY_API_KEY: 'test-twenty-api-key-for-vitest-environment-execution',
      TWENTY_METADATA_URL: 'http://localhost:3001/metadata',
      TWENTY_AUTH_ORIGIN: 'http://localhost:3001',
      NEXTAUTH_URL: 'http://localhost:3000',
      NEXTAUTH_SECRET: 'test-secret-key-for-vitest-execution-32-chars-long',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
