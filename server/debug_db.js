require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('DATABASE_URL:', process.env.DATABASE_URL);

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to database...');
        const users = await prisma.user.findMany();
        console.log('Connection successful.');
        console.log('User count:', users.length);
        console.log('Users:', JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('Database connection failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
