require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.user.findMany();
        console.log('Total users:', users.length);
        console.log('\nUser details:');
        users.forEach((user, index) => {
            console.log(`\n--- User ${index + 1} ---`);
            console.log('ID:', user.id);
            console.log('Email:', user.email);
            console.log('Name:', user.name);
            console.log('Profile:', user.profile);
            console.log('Profile length:', user.profile ? user.profile.length : 0);
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();
