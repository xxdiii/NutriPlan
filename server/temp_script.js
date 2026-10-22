require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  for (const u of users) {
    console.log(u.email, 'Profile length:', u.profile.length);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
