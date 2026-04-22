
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('Prisma Client Keys:', Object.keys(prisma));

if (prisma.favoriteRecipe) {
    console.log('✅ favoriteRecipe model functionality found on Prisma Client');
} else {
    console.error('❌ favoriteRecipe model MISSING from Prisma Client');
}

prisma.$disconnect();
