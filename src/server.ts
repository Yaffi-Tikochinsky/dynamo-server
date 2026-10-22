import { env } from './config/env';
import { createApp } from './app';
import { prisma } from './db/prisma';

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT} – API docs at /api-docs`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
