import { defineConfig } from 'vitest/config';

// Tests run against a real PostgreSQL database (never the development one).
// Default: the local Docker database from the README; override with TEST_DATABASE_URL.
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@localhost:55432/challenges_test?schema=public';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './tests/globalSetup.ts',
    fileParallelism: false, // one shared test database
    testTimeout: 20000,
    hookTimeout: 120000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: 'test-secret-that-is-long-enough-1234567890',
      JWT_EXPIRES_IN: '1h',
      CORS_ORIGIN: '*',
    },
  },
});
