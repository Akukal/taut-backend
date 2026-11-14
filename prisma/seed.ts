import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);
  await prisma.user.upsert({
    where: { email: 'demo@taut.chat' },
    update: {},
    create: { username: 'demo', email: 'demo@taut.chat', passwordHash },
  });
  await prisma.user.upsert({
    where: { email: 'friend@taut.chat' },
    update: {},
    create: { username: 'friend', email: 'friend@taut.chat', passwordHash },
  });
  console.log('Seed users created. Demo password: password123');
}

main().finally(() => prisma.$disconnect());
