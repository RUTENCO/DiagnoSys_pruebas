const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!url) throw new Error('Missing database URL');

const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

const candidates = [
  ['organizacion1@gmail.com', 'Organizacion1234'],
  ['consultor1@gmail.com', 'Consultor1234'],
  ['admin@diagnosys.local', 'Admin12345!'],
];

(async () => {
  for (const [email, password] of candidates) {
    const user = await prisma.user.findUnique({ where: { email }, select: { email: true, password: true } });
    if (!user) {
      console.log(`${email}: not found`);
      continue;
    }
    const ok = await bcrypt.compare(password, user.password);
    console.log(`${email}: ${ok ? 'OK' : 'NO'}`);
  }
})()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
