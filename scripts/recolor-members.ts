// One-time update: moves existing users from the old member colors to the new warm ones.
// Run with: npx tsx scripts/recolor-members.ts
import { PrismaClient } from '@prisma/client';
import { MEMBER_COLORS } from '../src/lib/constants';

const OLD_COLORS = [
  '#2A78D6', '#EB6834', '#1BAF7A', '#EDA100', '#E87BA4',
  '#008300', '#6250D6', '#E34948', '#0F9BB5', '#8A5A2B',
];

const prisma = new PrismaClient();

async function main() {
  for (let i = 0; i < OLD_COLORS.length; i++) {
    const { count } = await prisma.user.updateMany({ where: { color: OLD_COLORS[i] }, data: { color: MEMBER_COLORS[i] } });
    if (count) console.log(`${OLD_COLORS[i]} -> ${MEMBER_COLORS[i]}: ${count} users`);
  }
}

main().finally(() => prisma.$disconnect());
