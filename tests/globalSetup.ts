import { execSync } from 'child_process';

/** Creates/clears the test database and applies all migrations once before the tests. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@localhost:55432/challenges_test?schema=public';
  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
